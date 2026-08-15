#!/usr/bin/env python3
"""
Export the Knova database back into the ML-training CSVs in ml/data/.

This is the inverse of seed_db.py: it reads the live tables and emits the exact
CSV schema the notebook pipeline (ml/notebook/Knova_Engine.ipynb) consumes, so a
retrain can run on real captured telemetry instead of synthetic data. It closes
the loop described in TELEMETRY_PLAN.md (Phase 3).

Emits five files into --out (default ml/data/_export):
    knova_interactions.csv   (16-col contract — the ground-truth engagement table)
    knova_users.csv          (user_id, name, interests, primary_topic, base_skill_level, ...)
    knova_content.csv        (content_id, type, topic, ... payload columns)
    knova_follows.csv        (user_id, creator_id)
    knova_interests.csv      (user_id, topic, source, weight, added_at)

Contract fidelity (must not drift, or the notebook breaks)
----------------------------------------------------------
* Interactions are filtered to view_count > 0 — a row the feed served but the
  client never confirmed on screen is not a real observation and is dropped.
* The three point-in-time fields (is_interest_match, creator_followed,
  difficulty_gap) are read from the stored server-side SNAPSHOTS, never
  recomputed — recomputing from current state would leak future information
  (interests, follows and skill all drift) into a training row.
* dwell_ratio_actual = dwell_time_sec / Post.est_read_seconds; engagement_score
  is recomputed with the single shared formula in ml.constants so seeded and
  organic rows are indistinguishable.
* upvote / downvote come from a LEFT JOIN on votes. Caveat: `votes` holds current
  state, not history, so a vote later retracted is simply absent here.
* content `type` uses the training labels (ContentType.TEXT -> 'text_content').

ext_id bridge
-------------
The ML artifacts are keyed by integer ids; the DB uses UUIDs. Seeded rows carry
the generator's integer in ext_id. Organic rows (ext_id NULL) are assigned stable
integers above the seeded maximum, and the assignment is persisted to
`_ext_id_map.json` in the output dir so successive exports stay consistent.

Synthetic vs organic
---------------------
A row is treated as ORGANIC (produced by real activity) if any of session_id,
model_version or last_event_at is set — the seeder leaves all three NULL. Use
--organic-only to export just those; the default includes everything. The
dimension tables (users/content/follows/interests) are always exported in full
so referential integrity holds regardless of the interaction filter.

Usage
-----
  EXPORT_DATABASE_URL='postgresql://...:5432/postgres' \
      python export_training_data.py --organic-only --out ml/data/_export_test
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import ssl
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import pandas as pd
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from ml import constants as C  # noqa: E402
from src.db.models import (  # noqa: E402
    ContentType,
    CreatorFollow,
    CreatorProfile,
    Flashcard,
    Interaction,
    Mcq,
    Post,
    Topic,
    User,
    UserTopicInterest,
    Vote,
)

# DB ContentType value -> training `type` label (inverse of seed_db.CONTENT_TYPE_MAP).
CONTENT_TYPE_EXPORT = {
    ContentType.TEXT: "text_content",
    ContentType.SHORT_NOTE: "short_note",
    ContentType.MCQ: "mcq",
    ContentType.FLASHCARD: "flashcard",
}

MAP_FILE = "_ext_id_map.json"


# --------------------------------------------------------------------------
# Small helpers
# --------------------------------------------------------------------------
def b01(v) -> int:
    """Truthy -> 1, else 0 (None included)."""
    return 1 if v else 0


def fmt_dt(v) -> str:
    return v.strftime("%Y-%m-%d %H:%M:%S") if v is not None else ""


def ctype_value(ctype) -> str:
    return ctype.value if hasattr(ctype, "value") else str(ctype)


# --------------------------------------------------------------------------
# ext_id resolution
# --------------------------------------------------------------------------
def resolve_ext_ids(rows, persisted: dict, key: str) -> dict:
    """Map every row's UUID to a stable integer ext_id.

    Real ext_ids win; UUIDs without one reuse a previously-assigned integer from
    the persisted map, or get the next free integer above every id seen so far.
    `rows` is an iterable of (uuid, ext_id). Mutates `persisted[key]`.
    """
    result: dict = {}
    used: set[int] = set()
    max_ext = 0

    rows = list(rows)
    for uid, ext in rows:
        if ext is not None:
            result[uid] = int(ext)
            used.add(int(ext))
            max_ext = max(max_ext, int(ext))

    assigned = {k: int(v) for k, v in persisted.get(key, {}).items()}
    for val in assigned.values():
        used.add(val)
        max_ext = max(max_ext, val)

    nxt = max_ext + 1
    for uid, ext in rows:
        if ext is not None:
            continue
        skey = str(uid)
        if skey in assigned:
            result[uid] = assigned[skey]
            continue
        while nxt in used:
            nxt += 1
        result[uid] = nxt
        assigned[skey] = nxt
        used.add(nxt)
        nxt += 1

    persisted[key] = assigned
    return result


# --------------------------------------------------------------------------
# Row builders (one per output CSV)
# --------------------------------------------------------------------------
async def _load_interests(session) -> dict:
    """user UUID -> [(topic_name, affinity, source, updated_at)] sorted by affinity desc."""
    rows = (
        await session.execute(
            select(
                UserTopicInterest.user_id,
                Topic.name,
                UserTopicInterest.affinity_score,
                UserTopicInterest.source,
                UserTopicInterest.updated_at,
            ).join(Topic, Topic.id == UserTopicInterest.topic_id)
        )
    ).all()
    by_user: dict = defaultdict(list)
    for uid, name, aff, source, updated in rows:
        by_user[uid].append((name, float(aff or 0.0), source, updated))
    for uid in by_user:
        by_user[uid].sort(key=lambda t: t[1], reverse=True)
    return by_user


def build_interactions(rows, user_map, creator_map, post_map, organic_only: bool):
    out = []
    per_user_count: dict = defaultdict(int)
    for r in rows:
        organic = r.session_id is not None or r.model_version is not None or r.last_event_at is not None
        if organic_only and not organic:
            continue

        dwell = float(r.dwell_time_sec or 0.0)
        est = float(r.est_read_seconds or 0.0)
        dwell_ratio = dwell / est if est > 0 else 0.0
        upvote = 1 if r.vote == 1 else 0
        downvote = 1 if r.vote == -1 else 0
        interest_match = bool(r.is_interest_match)
        quiz_correct = bool(r.quiz_correct)

        engagement = C.engagement_score(
            upvote=bool(upvote),
            quiz_correct=quiz_correct,
            dwell_ratio=dwell_ratio,
            is_interest_match=interest_match,
        )

        per_user_count[r.user_id] += 1
        out.append({
            "user_id": user_map[r.user_id],
            "content_id": post_map[r.post_id],
            "creator_id": creator_map[r.creator_id],
            "topic": r.topic or "",
            "is_interest_match": b01(r.is_interest_match),
            "creator_followed": b01(r.creator_followed),
            # snapshot; None only on rows never served via the feed (e.g. a bare
            # vote). Fall back to 0.0 so the notebook's abs_difficulty_gap stays finite.
            "difficulty_gap": float(r.difficulty_gap) if r.difficulty_gap is not None else 0.0,
            "dwell_ratio_actual": dwell_ratio,
            "actual_dwell_sec": dwell,
            "did_quiz": b01(r.quiz_answered),
            "quiz_correct": b01(r.quiz_correct),
            "upvote": upvote,
            "downvote": downvote,
            "engagement_score": engagement,
            "card_flipped": b01(r.card_flipped),
            "flip_time_sec": float(r.flip_time_sec) if r.flip_time_sec is not None else "",
        })
    return out, per_user_count


# --------------------------------------------------------------------------
# Orchestration
# --------------------------------------------------------------------------
async def export(session, out_dir: Path, organic_only: bool) -> None:
    persisted = {}
    map_path = out_dir / MAP_FILE
    if map_path.exists():
        persisted = json.loads(map_path.read_text())

    # --- ext_id maps over every referenced entity ---
    user_rows = (await session.execute(select(User.id, User.ext_id))).all()
    creator_rows = (await session.execute(select(CreatorProfile.id, CreatorProfile.ext_id))).all()
    post_rows = (await session.execute(select(Post.id, Post.ext_id))).all()

    user_map = resolve_ext_ids(user_rows, persisted, "users")
    creator_map = resolve_ext_ids(creator_rows, persisted, "creators")
    post_map = resolve_ext_ids(post_rows, persisted, "posts")

    # --- interactions (the core export) ---
    inter_rows = (
        await session.execute(
            select(
                Interaction.user_id,
                Interaction.post_id,
                Post.creator_id,
                Topic.name.label("topic"),
                Interaction.is_interest_match,
                Interaction.creator_followed,
                Interaction.difficulty_gap,
                Interaction.dwell_time_sec,
                Post.est_read_seconds,
                Interaction.quiz_answered,
                Interaction.quiz_correct,
                Interaction.card_flipped,
                Interaction.flip_time_sec,
                Vote.value.label("vote"),
                Interaction.session_id,
                Interaction.model_version,
                Interaction.last_event_at,
            )
            .join(Post, Post.id == Interaction.post_id)
            .outerjoin(Topic, Topic.id == Post.topic_id)
            .outerjoin(
                Vote,
                and_(Vote.user_id == Interaction.user_id, Vote.post_id == Interaction.post_id),
            )
            .where(Interaction.view_count > 0)
        )
    ).all()
    interactions, per_user_count = build_interactions(
        inter_rows, user_map, creator_map, post_map, organic_only
    )

    # --- users ---
    interests_by_user = await _load_interests(session)
    user_records = (
        await session.execute(
            select(User.id, User.ext_id, User.username, User.estimated_expertise, User.curiosity_score)
        )
    ).all()
    users = []
    for uid, _ext, username, skill, curiosity in user_records:
        interests = interests_by_user.get(uid, [])
        topics = [t[0] for t in interests]
        users.append({
            "user_id": user_map[uid],
            "name": username or "",
            "interests": "|".join(topics),
            "primary_topic": topics[0] if topics else "",
            "base_skill_level": float(skill if skill is not None else 0.5),
            "curiosity_score": float(curiosity if curiosity is not None else 0.5),
            "total_expected_interactions": per_user_count.get(uid, 0),
        })

    # --- content ---
    content_records = (
        await session.execute(
            select(
                Post.id, Post.content_type, Topic.name, Post.difficulty, Post.word_count,
                Post.title, Post.body, Post.published_at, Post.est_read_seconds, Post.creator_id,
                Mcq.question, Mcq.options, Mcq.correct_index, Mcq.explanation,
                Flashcard.front, Flashcard.back, Flashcard.flip_threshold_sec,
            )
            .outerjoin(Topic, Topic.id == Post.topic_id)
            .outerjoin(Mcq, Mcq.post_id == Post.id)
            .outerjoin(Flashcard, Flashcard.post_id == Post.id)
        )
    ).all()
    content = []
    for rec in content_records:
        (pid, ctype, topic, diff, wc, title, body, pub, est, creator_id,
         q, opts, cidx, expl, front, back, flip) = rec
        is_mcq = ctype == ContentType.MCQ
        is_card = ctype == ContentType.FLASHCARD
        if is_mcq:
            description = q or ""
        elif is_card:
            description = ""
        else:
            description = body or ""
        content.append({
            "content_id": post_map[pid],
            "type": CONTENT_TYPE_EXPORT.get(ctype, ctype_value(ctype)),
            "topic": topic or "",
            "difficulty_score": float(diff if diff is not None else 0.5),
            "word_count": int(wc or 0),
            "title": title or "",
            "description": description,
            "front_desc": front or "" if is_card else "",
            "back_desc": back or "" if is_card else "",
            # Python-list repr, matching the generator (seed_db parses it with literal_eval).
            "options": str(list(opts)) if is_mcq and opts is not None else "",
            "correct_index": cidx if is_mcq and cidx is not None else "",
            "explanation": expl or "" if is_mcq else "",
            "flip_threshold_sec": float(flip) if is_card and flip is not None else "",
            "creator_id": creator_map[creator_id],
            "published_at": fmt_dt(pub),
            "expected_read_time_sec": int(est or 0),
        })

    # --- follows ---
    follow_records = (
        await session.execute(select(CreatorFollow.follower_id, CreatorFollow.creator_id))
    ).all()
    follows = [
        {"user_id": user_map[f], "creator_id": creator_map[c]}
        for f, c in follow_records
        if f in user_map and c in creator_map
    ]

    # --- interests ---
    interests = []
    for uid, entries in interests_by_user.items():
        for name, aff, source, updated in entries:
            interests.append({
                "user_id": user_map[uid],
                "topic": name,
                "source": source or "onboarding",
                "weight": aff,
                "added_at": fmt_dt(updated),
            })

    # --- write, with the exact header order the pipeline expects ---
    out_dir.mkdir(parents=True, exist_ok=True)
    _write(out_dir / "knova_interactions.csv", interactions, [
        "user_id", "content_id", "creator_id", "topic", "is_interest_match",
        "creator_followed", "difficulty_gap", "dwell_ratio_actual", "actual_dwell_sec",
        "did_quiz", "quiz_correct", "upvote", "downvote", "engagement_score",
        "card_flipped", "flip_time_sec",
    ])
    _write(out_dir / "knova_users.csv", users, [
        "user_id", "name", "interests", "primary_topic", "base_skill_level",
        "curiosity_score", "total_expected_interactions",
    ])
    _write(out_dir / "knova_content.csv", content, [
        "content_id", "type", "topic", "difficulty_score", "word_count", "title",
        "description", "front_desc", "back_desc", "options", "correct_index",
        "explanation", "flip_threshold_sec", "creator_id", "published_at",
        "expected_read_time_sec",
    ])
    _write(out_dir / "knova_follows.csv", follows, ["user_id", "creator_id"])
    _write(out_dir / "knova_interests.csv", interests, [
        "user_id", "topic", "source", "weight", "added_at",
    ])

    map_path.write_text(json.dumps(persisted, indent=2))

    print(f"\nExported to {out_dir}/")
    print(f"  interactions : {len(interactions):>7}  (view_count>0"
          f"{', organic only' if organic_only else ''})")
    print(f"  users        : {len(users):>7}")
    print(f"  content      : {len(content):>7}")
    print(f"  follows      : {len(follows):>7}")
    print(f"  interests    : {len(interests):>7}")
    print(f"  ext_id map   : {map_path.name}")


def _write(path: Path, rows: list[dict], columns: list[str]) -> None:
    df = pd.DataFrame(rows, columns=columns)
    df.to_csv(path, index=False)


# --------------------------------------------------------------------------
# Engine / CLI  (mirrors seed_db.py)
# --------------------------------------------------------------------------
def make_engine(url: str):
    for pre, repl in (
        ("postgres://", "postgresql+asyncpg://"),
        ("postgresql://", "postgresql+asyncpg://"),
        ("postgresql+psycopg2://", "postgresql+asyncpg://"),
        ("postgresql+psycopg://", "postgresql+asyncpg://"),
    ):
        if url.startswith(pre):
            url = url.replace(pre, repl, 1)
            break

    parts = urlsplit(url)
    host = parts.hostname or ""
    clean = urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))
    connect_args = {}
    if host not in ("localhost", "127.0.0.1", ""):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ctx
    return create_async_engine(clean, connect_args=connect_args)


async def run(url: str, out_dir: Path, organic_only: bool) -> None:
    engine = make_engine(url)
    async with AsyncSession(engine) as session:
        print("Exporting training data...")
        await export(session, out_dir, organic_only)
    await engine.dispose()
    print("\nDone.")


def main():
    ap = argparse.ArgumentParser(description="Export the Knova DB into ml/data training CSVs.")
    ap.add_argument("--out", default=str(ROOT / "ml" / "data" / "_export"),
                    help="output directory (default ml/data/_export)")
    ap.add_argument("--database-url", default=None, help="direct (non-pooler) Postgres URL")
    grp = ap.add_mutually_exclusive_group()
    grp.add_argument("--organic-only", action="store_true",
                     help="export only rows produced by real activity (not the seeder)")
    grp.add_argument("--include-synthetic", action="store_true",
                     help="export seeded and organic rows (default)")
    args = ap.parse_args()

    url = args.database_url or os.environ.get("EXPORT_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("No DB URL. Set EXPORT_DATABASE_URL or pass --database-url (use the DIRECT connection).")

    asyncio.run(run(url, Path(args.out), args.organic_only))


if __name__ == "__main__":
    main()
