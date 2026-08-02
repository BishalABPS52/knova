# Knova Telemetry Implementation Plan

## Context

Knova is billed as a *telemetry-driven* recommendation engine, but no telemetry
is captured. The `Interaction` table exists and is fully designed
(`backend/src/db/models.py:307-341`), yet **nothing in the application ever writes
a row** — the only writer is `seed_db.py:431`, which bulk-loads faker-generated
data from `ml/data/knova_interactions.csv`.

The consequences are concrete:

1. **The ranker runs on constants.** `backend/src/recommendation/features.py:43`
   starts every candidate from `C.FEATURE_MEDIANS` and computes only 3 of the 15
   features live (`als_score`, `topic_similarity`, `tag_similarity`). The other 12 —
   including `dwell_norm_by_type`, `mastery_score`, `creator_trust`,
   `user_topic_interaction_count` — are frozen training medians, identical for every
   user. Personalization is currently much weaker than the architecture implies.
2. **The feed cannot page.** `retrieval.py:118` excludes posts that have an
   `Interaction` row. Since organic users never produce one, every `/posts/feed`
   call draws from the same pool. The frontend papers over this with a client-side
   `seenIdsRef` dedup (`frontend/src/app/(main)/page.tsx`).
3. **There is no path to retraining on real data.** The notebook pipeline
   (`ml/notebook/Knova_Engine.ipynb`) consumes a specific CSV schema that only
   `synthetic_data.py` can currently produce.

The goal is to close the loop end-to-end: capture real engagement in the browser,
persist it in the shape the ML pipeline already expects, use it to serve real
features immediately, and be able to export it for a retrain later.

### Decisions already made
- **Seen policy:** qualified-seen threshold — a post only counts as "seen" once
  dwell ≥ 2s or the user genuinely engaged. Cheap scroll-pasts stay eligible.
- **Storage shape:** upsert one row per `(user_id, post_id)`, matching the ML
  contract. No new event tables, no queue (consistent with the existing
  BackgroundTasks-only approach).
- **Scope includes serving live features**, not just capture and export.

---

## The data contract (must not drift)

`ml/data/knova_interactions.csv` — 16 columns, produced by
`ml/notebook/synthetic_data.py:604`, consumed by the notebook:

```
user_id, content_id, creator_id, topic, is_interest_match, creator_followed,
difficulty_gap, dwell_ratio_actual, actual_dwell_sec, did_quiz, quiz_correct,
upvote, downvote, engagement_score, card_flipped, flip_time_sec
```

Derived quantities that live telemetry must reproduce identically:

```python
dwell_ratio_actual = actual_dwell_sec / expected_read_time_sec
engagement_score   = upvote*0.3 + quiz_correct*0.3
                   + min(dwell_ratio, 1.5)/1.5*0.2 + is_interest_match*0.2
relevance          = (dwell >= expected*0.6) + upvote
                   + (type == 'flashcard' and card_flipped)      # clip 0..3
```

`Post.est_read_seconds` is the live equivalent of `expected_read_time_sec`.
`creator_trust` is a literal alias of `creator_followed` in training — worth
knowing, because it means it is computable today for free.

**Point-in-time correctness.** `is_interest_match`, `creator_followed` and
`difficulty_gap` all depend on state that changes (interests, follow graph,
`User.estimated_expertise`). Recomputing them at export time would leak future
state into training rows. They must be **snapshotted server-side when the post is
served**, not derived later.

---

## Phase 0 — Repo hygiene

**`.gitignore`** — append a section (nothing matching these is currently tracked,
so this is purely preventive):

```gitignore
# ── Claude Code / MCP / Serena ──────────────────────────────────
.claude/
**/.claude/
.claude/worktrees/
CLAUDE.md
.mcp.json
**/.mcp.json
.serena/
**/.serena/
```

> `CLAUDE.md` is deliberately ignored alongside the rest of the agent config.
> Drop that one line to commit it instead, so teammates share the same project
> instructions.

**`CLAUDE.md`** at the repo root, covering what a fresh session cannot infer:
the three-package layout; the `router.py` / `schemas.py` / `service.py` module
convention (note `onboarding/route.py` is the odd one out); cookie-based auth via
`is_authenticated` returning a **raw JWT payload**, not a `User`; the
`User.ext_id` / `Post.ext_id` integer bridge to the ML artifacts; the rule that
`ml/constants.py` must stay in lockstep with `backend/models/*.pkl`; Alembic
revision ids must be ≤32 chars; the async-session gotcha documented at
`src/posts/service.py:295` (read counters *before* `await db.commit()`);
`uv`-managed venv at `backend/.venv`; and Conventional Commits targeting `dev`,
never `main` (per `CONTRIBUTING.md`).

---

## Phase 1 — Backend capture

### 1a. Migration

`backend/alembic/versions/interaction_telemetry.py`, `down_revision = 'sync_model_columns'`
(current head). Revision id `interaction_telemetry` — 21 chars, within the ≤32 limit.

Order matters:

1. **Dedupe first.** The seeder may have inserted several rows per
   `(user_id, post_id)` from the CSV. Collapse to the highest-dwell row before
   adding the constraint, or the `ALTER TABLE` fails.
2. `UniqueConstraint("user_id", "post_id", name="uq_interaction_pair")`.
3. New columns on `interactions`:

| Column | Type | Purpose |
|---|---|---|
| `session_id` | `String(64)`, null, indexed | idempotent dwell accounting; future sessionization |
| `session_dwell_sec` | `Float`, default 0 | current session's contribution to the lifetime total |
| `view_count` | `Integer`, default 0 | confirmed client-side impressions; 0 = served but never seen |
| `is_interest_match` | `Boolean`, null | **snapshot** at serve time |
| `creator_followed` | `Boolean`, null | **snapshot** at serve time |
| `difficulty_gap` | `Float`, null | **snapshot**: `post.difficulty - user.estimated_expertise` |
| `rank_source` | `String(24)`, null | `followed_creator` / `ranked` / `explore_thompson` / `backfill` |
| `ranker_score` | `Float`, null | `final_score` at serve time — enables offline eval |
| `model_version` | `String(32)`, null | which artifact set produced the ranking |
| `last_event_at` | `DateTime(timezone=True)`, null | freshness, distinct from `created_at` |

Mirror all of it in `backend/src/db/models.py` in the same commit.

### 1b. Server-side impression logging

The server, not the client, is the trustworthy source for the snapshot fields —
and `assemble_feed` already computes everything needed and throws it away.

- `backend/src/recommendation/ranker.py:68` — include `final_score` in each dict
  it returns alongside the existing `post_id` and `source`.
- `backend/src/recommendation/retrieval.py` — add `Post.difficulty` to
  `_base_columns()` and a `difficulty` field to `CandidateRow` (Phase 4 needs it too).
- `backend/src/recommendation/service.py:36` — after `assemble_feed`, schedule a
  BackgroundTask that upserts one row per served post with
  `view_count=0, dwell_time_sec=0`, plus `feed_position` (list index), `surface=FEED`,
  `rank_source`, `ranker_score`, and the three snapshots computed from `ctx`
  (`ctx.interest_topics`, `ctx.followed_creator_ids`, `ctx.base_skill_level`).
  The router already takes no `BackgroundTasks` param — add one, following the
  pattern at `src/reference/router.py:39`.

Follow `src/quiz/tasks.py`: the task **opens its own `AsyncSessionLocal`** (the
request session is closed by then) and swallows exceptions so telemetry can never
fail a feed request.

Rows with `view_count = 0` are "served but unconfirmed" — excluded from training
export, and (having dwell 0) they do not trip the qualified-seen filter.

### 1c. Ingest endpoint

New module `backend/src/telemetry/{router,schemas,service}.py`, mounted in
`main.py` as `base_router.include_router(telemetry_router, prefix="/interactions")`.

`POST /api/v1/interactions` — `is_authenticated`, accepts a batch:

```python
class InteractionEvent(BaseModel):
    post_id: UUID
    surface: InteractionSurface = InteractionSurface.FEED
    feed_position: int | None = None
    dwell_sec: float = Field(0, ge=0, le=3600)   # cumulative for THIS session
    scroll_depth: float | None = Field(None, ge=0, le=1)
    quiz_answered: bool | None = None
    quiz_correct: bool | None = None
    card_flipped: bool | None = None
    flip_time_sec: float | None = Field(None, ge=0, le=3600)

class InteractionBatch(BaseModel):
    session_id: str = Field(max_length=64)
    events: list[InteractionEvent] = Field(max_length=50)
```

`service.record_batch` — one `SELECT` for the referenced posts (need
`est_read_seconds`, `content_type`), then a single
`postgresql.insert(...).on_conflict_do_update(constraint="uq_interaction_pair")`:

```python
# idempotent across retries, correct across sessions
dwell_time_sec = case(
    (Interaction.session_id == excluded.session_id,
     Interaction.dwell_time_sec - Interaction.session_dwell_sec + excluded.session_dwell_sec),
    else_=Interaction.dwell_time_sec + excluded.session_dwell_sec,
)
session_dwell_sec = excluded.session_dwell_sec
session_id        = excluded.session_id
view_count        = Interaction.view_count + 1
quiz_answered     = func.coalesce(Interaction.quiz_answered, False) | func.coalesce(excluded.quiz_answered, False)
card_flipped      = func.coalesce(Interaction.card_flipped, False)  | func.coalesce(excluded.card_flipped, False)
scroll_depth      = func.greatest(...)          # monotonic
flip_time_sec     = func.coalesce(Interaction.flip_time_sec, excluded.flip_time_sec)  # first flip wins
```

Sending **absolute session cumulative** dwell rather than deltas is what makes
this safe: a duplicated or replayed batch is a no-op instead of double-counting.

Then derive and store, in the same statement:
`completion_ratio = clamp(dwell / est_read_seconds, 0, 1)`,
`is_completed = ratio >= 0.9`, and
`engagement_weight` via the training `engagement_score` formula (upvote read from
`votes`, `is_interest_match` from the stored snapshot) — matching
`seed_db.py:431` exactly so seeded and organic rows are indistinguishable.

Also increment `Post.impression_count` / `Post.read_complete_count`, which are
declared but dead today.

### 1d. Wire the existing engagement endpoints

`cast_vote` (`src/posts/service.py:207`) and `toggle_save` (`:270`) should ensure
an interaction row exists for the pair, so a vote from outside the feed still
produces a training row. Mind the read-before-commit rule at `:295`.

### 1e. Qualified-seen filter

`ml/constants.py`: add `SEEN_DWELL_SEC = 2.0`. Then `retrieval.py:118`:

```python
seen_subq = select(Interaction.post_id).where(
    Interaction.user_id == ctx.user_id,
    or_(
        Interaction.dwell_time_sec >= C.SEEN_DWELL_SEC,
        Interaction.is_completed.is_(True),
        Interaction.quiz_answered.is_(True),
        Interaction.card_flipped.is_(True),
    ),
)
```

---

## Phase 2 — Frontend capture

### 2a. Telemetry client — `frontend/src/lib/telemetry.ts`

A module singleton, mirroring the `postService` style in `src/lib/posts.ts`:

- `Map<postId, PendingEvent>` buffer holding **cumulative session values**.
- `session_id` = a `crypto.randomUUID()` held in `sessionStorage`.
- API: `trackImpression(postId, feedPosition, surface)`, `addDwell(postId, ms)`,
  `trackQuiz(postId, correct)`, `trackFlip(postId, msToFlip)`, `trackScroll(postId, depth)`.
- Flush on: 10s interval, buffer > 20 entries, `visibilitychange → hidden`, and `pagehide`.
- Transport: `fetch(url, { method: 'POST', credentials: 'include', keepalive: true, ... })`.
  **`keepalive` is the primary path, not `sendBeacon`** — auth is cross-origin
  cookies (`samesite=none`) and beacon's JSON content-type triggers a preflight
  that is unreliable during unload. Keep `sendBeacon` as a last-resort fallback.
- On failure, merge the batch back into the buffer rather than dropping it — safe
  because the payload is absolute, not incremental.

Reuse `getApiUrl()` from `src/lib/api.ts`; bypass the `api<T>()` wrapper so a
telemetry 401 never triggers the shared refresh dedup.

### 2b. Dwell tracking hook — `frontend/src/hooks/useDwellTracker.ts`

`IntersectionObserver` at `threshold: 0.5`, accumulating visible milliseconds and
pausing on `document.visibilityState !== 'visible'` so a backgrounded tab doesn't
inflate dwell. `react-intersection-observer` v10 is already a dependency.

### 2c. Instrumentation points

| File | Signal |
|---|---|
| `src/app/(main)/page.tsx` | wrap each mapped card; `feed_position` = index, `surface: feed` |
| `src/app/(main)/learnspace/page.tsx:42` | already has an `IntersectionObserver` at `threshold 0.6` — attach dwell to the existing `activeIndex` logic |
| `src/components/cards/McqCard.tsx:191` | `onClick={() => setSelected(i)}` → also `trackQuiz(id, i === correctIndex)` |
| `src/components/cards/FlashCard.tsx:70` | flip toggle → `trackFlip(id, now - firstVisibleAt)` |
| `src/components/cards/TextContentCard.tsx:157` | "Read more" expand → `trackScroll(id, 1.0)` |

Votes and saves already hit the API; Phase 1d covers them server-side.

**Note:** `learnspace` and `explore` currently render mock data
(`src/data/mockData.ts`) and the feed silently falls back to `feedData.ts` on
error. Instrument the real-data paths only, and guard on the existing
`useMockData` flag so mock ids never reach the API.

---

## Phase 3 — Training export

`export_training_data.py` at the repo root, beside `seed_db.py` (same conventions,
same argparse style). It is the inverse of `seed_db.py:431`.

Emits, into `ml/data/`, the CSVs the notebook already consumes — so
`Knova_Engine.ipynb` runs unchanged on real data:
`knova_interactions.csv`, `knova_users.csv`, `knova_content.csv`,
`knova_follows.csv`, `knova_interests.csv`.

Rules:
- Filter `view_count > 0` (drop served-but-never-seen rows).
- `user_id` / `content_id` = `ext_id` when present; otherwise assign stable
  integers above the seeded max and persist the mapping so successive exports
  stay consistent.
- `is_interest_match`, `creator_followed`, `difficulty_gap` come from the stored
  **snapshots**, never recomputed.
- `dwell_ratio_actual = dwell_time_sec / Post.est_read_seconds`;
  recompute `engagement_score` with the training formula.
- `upvote` / `downvote` from a `LEFT JOIN votes`. Caveat worth stating in the
  script docstring: a retracted vote is lost, since `votes` holds current state
  rather than history.
- `--include-synthetic / --organic-only` so real and seeded rows can be separated.

---

## Phase 4 — Serve live features

`backend/src/recommendation/features.py` currently starts from
`C.FEATURE_MEDIANS`. Replace medians with real values, keeping the median as the
fallback. Split by risk:

### 4a. Free wins — no telemetry required (do first)

These are computable **today** and are currently constants for every user:

| Feature | Source | Median today |
|---|---|---|
| `base_skill_level` | `ctx.base_skill_level` | 0.495 |
| `curiosity_score` | `ctx.curiosity_score` | 0.785 |
| `creator_trust` | `1.0 if cand.followed else 0.0` (training alias of `creator_followed`) | 0.0 |
| `content_type_enc` | `models.type_encoder.transform([cand.content_type])` — the encoder is loaded but never used | 1.0 |
| `depth_alignment` | `clip(1 - abs(cand.difficulty - ctx.base_skill_level), 0, 1)` | 0.767 |

### 4b. Telemetry-derived

New `backend/src/recommendation/user_stats.py` — one aggregate query per feed
request over `interactions` (joined to `posts`/`topics`), returning per-topic
`interaction_count`, `upvote_rate`, `mastery_score` (mean `quiz_correct`), plus
per-content-type mean `completion_ratio`. Feeds:
`user_topic_interaction_count`, `user_topic_upvote_rate`, `mastery_score`,
`kg_readiness` (`mastery - difficulty`), `dwell_norm_by_type`, `read_velocity`,
`similarity_weighted_engagement`.

Gate each on a minimum history (`MIN_HISTORY = 3` interactions in that topic);
below it, fall back to the median. New users behave exactly as they do today.

`dwell_norm_by_type` and `read_velocity` are per-content-type **z-scores** in
training. Add `DWELL_MEAN_BY_TYPE` / `DWELL_STD_BY_TYPE` constants to
`ml/constants.py`, regenerated from `knova_features_final.csv`, and document them
alongside the existing regeneration note at `ml/constants.py:1-13`.

> **Risk to verify, not assume:** the ranker was trained on synthetic data where
> these features had a particular distribution. Feeding real values shifts the
> input distribution under a model that has not been retrained. Phase 4 must ship
> behind a settings flag (`LIVE_FEATURES_ENABLED`, default on in dev) and be
> checked by comparing feed output before and after for the same user.

---

## Critical files

| File | Change |
|---|---|
| `backend/src/db/models.py:307` | `Interaction`: unique constraint + 10 columns |
| `backend/alembic/versions/interaction_telemetry.py` | new — dedupe, constraint, columns |
| `backend/src/telemetry/{router,schemas,service}.py` | new — batch ingest |
| `backend/src/recommendation/service.py:36` | serve-time impression logging |
| `backend/src/recommendation/ranker.py:68` | return `final_score` |
| `backend/src/recommendation/retrieval.py:118` | qualified-seen; `Post.difficulty` in `_base_columns()` |
| `backend/src/recommendation/features.py:43` | live features w/ median fallback |
| `backend/src/recommendation/user_stats.py` | new — per-user telemetry aggregates |
| `backend/src/posts/service.py:207,270` | vote/save touch the interaction row |
| `backend/ml/constants.py` | `SEEN_DWELL_SEC`, `MIN_HISTORY`, dwell z-score stats |
| `backend/main.py:80` | mount telemetry router |
| `frontend/src/lib/telemetry.ts` | new — buffered client |
| `frontend/src/hooks/useDwellTracker.ts` | new — IO + visibility dwell |
| `frontend/src/app/(main)/page.tsx`, `learnspace/page.tsx` | attach tracker |
| `frontend/src/components/cards/{McqCard,FlashCard,TextContentCard}.tsx` | quiz / flip / expand |
| `export_training_data.py` | new — DB → notebook CSVs |
| `CLAUDE.md`, `.gitignore` | new / updated |

Reuse rather than rebuild: `getApiUrl()` (`lib/api.ts`), `postService`
(`lib/posts.ts`), `_serialize_post` / `_user_states` (`posts/service.py`),
the BackgroundTasks pattern (`quiz/tasks.py`), the CSV↔DB mapping
(`seed_db.py:431`), and `react-intersection-observer` (already installed).

---

## Verification

**Phase 1**
```bash
cd backend
.venv/bin/alembic upgrade head && .venv/bin/alembic heads    # single head
.venv/bin/python -c "import main; print(len(main.app.routes))"
uvicorn main:app --reload
```
Then, with a logged-in session cookie:
1. `GET /api/v1/posts/feed?size=15` → confirm 15 rows appear in `interactions`
   with `view_count=0`, non-null `feed_position`, `rank_source`, and the three snapshots.
2. `POST /api/v1/interactions` with one event at `dwell_sec: 5.0` → row updates,
   `view_count=1`, `completion_ratio` sane.
3. **Replay the identical batch** → `dwell_time_sec` unchanged, `view_count=2`.
   This is the idempotency check; if dwell doubles, the `CASE` is wrong.
4. `GET /posts/feed` again → the 5s post is gone (≥2s), the untouched ones remain.

**Phase 2**
```bash
cd frontend && npx --no-install tsc --noEmit && npm run lint && npm run dev
```
Scroll the feed with DevTools → Network filtered to `interactions`: batches every
~10s and one on tab-hide. Answer an MCQ, flip a flashcard, then check the row has
`quiz_correct` and `flip_time_sec`. Background the tab for 30s and confirm dwell
does **not** grow.

**Phase 3**
```bash
python export_training_data.py --organic-only --out ml/data/_export_test
head -1 ml/data/_export_test/knova_interactions.csv   # must match the 16-column header byte-for-byte
```
Diff the header against `ml/data/knova_interactions.csv`. Spot-check that
`engagement_score` matches the formula for a few rows.

**Phase 4**
Capture `GET /posts/feed` for one user with `LIVE_FEATURES_ENABLED` off, then on,
and diff the ordering. Expect movement, not chaos — if the list is unrecognisable
the z-score constants are likely wrong. Confirm a brand-new user (no interactions)
gets a feed identical to the flag-off case.

**Regression:** `backend/tests/` is stdlib `unittest` with no DB fixtures, so add
pure-function tests for the `engagement_score` / `completion_ratio` derivations
and the export row mapper.

---

## Out of scope (flagged, not fixed)

- `retrieval.py` hard-filters `Post.ext_id.isnot(None)`, so **organic posts can
  never enter the feed** — they have no TF-IDF/ALS row. Telemetry on organic
  content will therefore stay empty until that is addressed.
- `frontend/src/lib/creator.ts` calls `/creator/{id}/follow` without the `/api/v1`
  prefix → 404s. Follows feed `creator_trust`, so this is worth a one-line fix.
- The frontend calls several endpoints that don't exist server-side (posts CRUD,
  comments, notifications).
- `knova_thompson_sampler.pkl` is never loaded (`thompson.py:26` explains why).
