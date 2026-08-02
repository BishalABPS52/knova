#!/usr/bin/env python3
"""
Seed the Knova database from the ML-generated CSVs in ml/data/.

The CSVs are the canonical source shared by ML training and the app DB. This
script parses them safely (pandas — the free-text fields contain commas), maps
them onto the SQLAlchemy models, and inserts in FK-dependency order.

Design notes
------------
* Only the asyncpg driver is installed, so this runs async.
* CSVs are read as strings (keep_default_na=False) so blanks are "" not NaN,
  then converted per-field explicitly.
* `options` is a Python-list repr ("['a', 'b']") -> ast.literal_eval, not JSON.
* Primary keys (UUIDs) are generated in Python so relationships can be linked
  in-memory without round-trips.
* Idempotency: pass --fresh to TRUNCATE the seed tables first (recommended for a
  clean reseed). Without it, keyed tables skip rows that already exist; keyless
  tables (interactions) are skipped entirely if already populated.

Usage
-----
  # 1. Validate the CSVs only (no DB connection):
  python seed_db.py --check

  # 2. Seed a fresh DB (uses the DIRECT connection URL, NOT the pooler):
  SEED_DATABASE_URL='postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres' \
      python seed_db.py --fresh

The URL may also be passed with --database-url. postgres:// / postgresql:// /
psycopg2 URLs are auto-normalized to asyncpg, and libpq-only query args
(?sslmode=...) are stripped (SSL is enabled automatically for remote hosts).
"""
from __future__ import annotations

import argparse
import ast
import asyncio
import os
import ssl
import sys
import uuid
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import pandas as pd
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
DATA = ROOT / "ml" / "data"
sys.path.insert(0, str(BACKEND))

from src.db.models import (  # noqa: E402
    ContentType,
    CreatorFollow,
    CreatorProfile,
    Flashcard,
    Interaction,
    InteractionSurface,
    Mcq,
    Post,
    Tag,
    Topic,
    User,
    UserTopicInterest,
    Vote,
)

BATCH = 5000

CONTENT_TYPE_MAP = {
    "text_content": ContentType.TEXT,
    "text": ContentType.TEXT,
    "short_note": ContentType.SHORT_NOTE,
    "mcq": ContentType.MCQ,
    "flashcard": ContentType.FLASHCARD,
}

# ext_id sentinel for the fallback creator that owns posts with no creator_id
SYSTEM_CREATOR_EXT = 0


# --------------------------------------------------------------------------
# CSV parsing helpers
# --------------------------------------------------------------------------
def read_csv(name: str) -> pd.DataFrame:
    return pd.read_csv(DATA / name, dtype=str, keep_default_na=False)


def s(v) -> str | None:
    v = (v or "").strip()
    return v or None


def to_float(v, default=None):
    v = (v or "").strip()
    try:
        return float(v) if v else default
    except ValueError:
        return default


def to_int(v, default=None):
    v = (v or "").strip()
    if not v:
        return default
    try:
        return int(float(v))
    except ValueError:
        return default


def to_bool(v) -> bool:
    return (v or "").strip() in ("1", "1.0", "True", "true")


def to_dt(v):
    v = (v or "").strip()
    if not v:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f"):
        try:
            return datetime.strptime(v, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(v)
    except ValueError:
        return None


def parse_options(v) -> list[str] | None:
    v = (v or "").strip()
    if not v:
        return None
    try:
        val = ast.literal_eval(v)
        if isinstance(val, (list, tuple)):
            return [str(x) for x in val]
    except (ValueError, SyntaxError):
        pass
    return None


def derive_body(row: dict, ctype: ContentType) -> str:
    """Post.body is NOT NULL. Populate from the field that carries the text for
    each content type (mcq/flashcard often have an empty `description`)."""
    if ctype == ContentType.FLASHCARD:
        return s(row.get("front_desc")) or s(row.get("back_desc")) or ""
    return s(row.get("description")) or s(row.get("title")) or ""


# --------------------------------------------------------------------------
# Validation (--check): pure CSV analysis, no DB
# --------------------------------------------------------------------------
def validate() -> bool:
    print("== Validating CSVs (no DB) ==\n")
    users = read_csv("knova_users.csv")
    content = read_csv("knova_content.csv")
    topics = read_csv("knova_topics.csv")
    interests = read_csv("knova_interests.csv")
    follows = read_csv("knova_follows.csv")
    interactions = read_csv("knova_interactions.csv")

    for name, df in [
        ("users", users), ("content", content), ("topics", topics),
        ("interests", interests), ("follows", follows), ("interactions", interactions),
    ]:
        print(f"  {name:14} {len(df):>7} rows")
    print()

    ok = True
    user_ids = {to_int(x) for x in users["user_id"]}
    topic_names = set(topics["topic"])

    # content
    content_recs = content.to_dict("records")
    empty_creator = sum(1 for r in content_recs if not s(r["creator_id"]))
    content_creators = {to_int(r["creator_id"]) for r in content_recs if s(r["creator_id"])}
    print(f"  content rows with empty creator_id : {empty_creator} (-> system creator)")
    print(f"  distinct content creators          : {len(content_creators)}")
    print(f"  content creators not in users      : "
          f"{len(content_creators - user_ids)} (-> placeholder users)")

    # topic coverage
    miss_ct = set(content["topic"]) - topic_names
    miss_it = set(interests["topic"]) - topic_names
    print(f"  content topics not in topics.csv   : {len(miss_ct)}")
    print(f"  interest topics not in topics.csv  : {len(miss_it)}")
    if miss_ct or miss_it:
        ok = False
        print("    !! unresolved topics:", sorted(miss_ct | miss_it)[:10])

    # mcq option parse
    bad_opts = 0
    for r in content_recs:
        if r["type"] == "mcq" and parse_options(r["options"]) is None:
            bad_opts += 1
    print(f"  mcq rows with unparseable options  : {bad_opts}")
    if bad_opts:
        ok = False

    # datetime parse
    bad_dt = sum(1 for r in content_recs if s(r["published_at"]) and to_dt(r["published_at"]) is None)
    print(f"  content rows with bad published_at : {bad_dt}")

    # interaction referential integrity
    content_ids = {to_int(r["content_id"]) for r in content_recs}
    inter_recs = interactions.to_dict("records")
    bad_u = sum(1 for r in inter_recs if to_int(r["user_id"]) not in user_ids)
    bad_c = sum(1 for r in inter_recs if to_int(r["content_id"]) not in content_ids)
    print(f"  interactions w/ unknown user_id    : {bad_u}")
    print(f"  interactions w/ unknown content_id : {bad_c}")

    print("\n== validation", "PASSED ==" if ok else "found issues above ==")
    return ok


# --------------------------------------------------------------------------
# Bulk insert helper
# --------------------------------------------------------------------------
async def bulk_insert(session: AsyncSession, model, rows: list[dict]) -> int:
    if not rows:
        return 0
    for k in range(0, len(rows), BATCH):
        await session.execute(model.__table__.insert(), rows[k:k + BATCH])
    await session.commit()
    return len(rows)


async def ext_map(session, model) -> dict[int, uuid.UUID]:
    """{ext_id: uuid} for a model, read back from the DB — so links are always
    the real persisted ids (correct on both fresh and incremental runs)."""
    res = await session.execute(select(model.ext_id, model.id).where(model.ext_id.isnot(None)))
    return {ext: mid for ext, mid in res.all()}


# --------------------------------------------------------------------------
# Seed phases
# --------------------------------------------------------------------------
async def seed_topics_tags(session):
    df = read_csv("knova_topics.csv")
    existing = {n for (n,) in (await session.execute(select(Topic.name))).all()}
    topic_rows = [
        {"id": uuid.uuid4(), "name": r["topic"], "parent_id": None}
        for r in df.to_dict("records") if r["topic"] not in existing
    ]
    n_t = await bulk_insert(session, Topic, topic_rows)

    topic_id = {n: i for n, i in (await session.execute(select(Topic.name, Topic.id))).all()}

    existing_tags = {n for (n,) in (await session.execute(select(Tag.name))).all()}
    seen, tag_rows = set(), []
    for r in df.to_dict("records"):
        for tag in (r["tags"] or "").split("|"):
            tag = tag.strip()
            if not tag or tag in seen or tag in existing_tags:
                continue
            seen.add(tag)
            tag_rows.append({
                "id": uuid.uuid4(), "name": tag,
                "primary_topic_id": topic_id.get(r["topic"]),
            })
    n_g = await bulk_insert(session, Tag, tag_rows)

    print(f"  topics: +{n_t}   tags: +{n_g}")
    return topic_id


async def seed_users(session):
    df = read_csv("knova_users.csv")
    existing = await ext_map(session, User)
    rows = []
    for r in df.to_dict("records"):
        ext = to_int(r["user_id"])
        if ext in existing:
            continue
        rows.append({
            "id": uuid.uuid4(),
            "ext_id": ext,
            "email": f"seed_user_{ext}@knova.local",
            "username": s(r["name"]) or f"user_{ext}",
            "estimated_expertise": to_float(r["base_skill_level"], 0.5),
            "curiosity_score": to_float(r["curiosity_score"], 0.5),
            "onboarding_completed": True,
            "is_active": True,
        })
    n = await bulk_insert(session, User, rows)
    print(f"  users: +{n}")
    return await ext_map(session, User)


async def seed_creators(session, user_id):
    """Create a CreatorProfile for every distinct creator_id referenced anywhere,
    synthesizing a placeholder user for creators that aren't in users.csv, plus a
    system creator (ext 0) for posts with no creator_id."""
    content = read_csv("knova_content.csv").to_dict("records")
    follows = read_csv("knova_follows.csv").to_dict("records")
    interactions = read_csv("knova_interactions.csv").to_dict("records")

    creator_exts = {SYSTEM_CREATOR_EXT}
    for r in content:
        if s(r["creator_id"]):
            creator_exts.add(to_int(r["creator_id"]))
    for r in follows:
        creator_exts.add(to_int(r["creator_id"]))
    for r in interactions:
        if s(r["creator_id"]):
            creator_exts.add(to_int(r["creator_id"]))

    # placeholder users for creators lacking a real account
    ph = []
    for ext in sorted(creator_exts):
        if ext in user_id:
            continue
        label = "system" if ext == SYSTEM_CREATOR_EXT else str(ext)
        ph.append({
            "id": uuid.uuid4(), "ext_id": ext,
            "email": f"seed_creator_{label}@knova.local",
            "username": f"Creator {label}", "is_active": True,
        })
    n_u = await bulk_insert(session, User, ph)
    if n_u:
        user_id = await ext_map(session, User)

    existing = await ext_map(session, CreatorProfile)
    rows = [
        {"id": uuid.uuid4(), "ext_id": ext, "user_id": user_id[ext]}
        for ext in sorted(creator_exts) if ext not in existing
    ]
    n_c = await bulk_insert(session, CreatorProfile, rows)
    print(f"  placeholder users: +{n_u}   creator_profiles: +{n_c}")
    return user_id, await ext_map(session, CreatorProfile)


async def seed_posts(session, topic_id, creator_id):
    df = read_csv("knova_content.csv")
    existing = await ext_map(session, Post)

    post_type: dict[int, ContentType] = {}
    posts, mcqs, flashcards = [], [], []

    for r in df.to_dict("records"):
        ext = to_int(r["content_id"])
        ctype = CONTENT_TYPE_MAP.get(r["type"], ContentType.TEXT)
        post_type[ext] = ctype
        if ext in existing:
            continue

        pid = uuid.uuid4()
        cext = to_int(r["creator_id"]) if s(r["creator_id"]) else SYSTEM_CREATOR_EXT
        posts.append({
            "id": pid,
            "ext_id": ext,
            "creator_id": creator_id[cext],
            "content_type": ctype,
            "title": s(r["title"]),
            "body": derive_body(r, ctype),
            "word_count": to_int(r["word_count"], 0),
            "est_read_seconds": to_int(r["expected_read_time_sec"], 0),
            "difficulty": to_float(r["difficulty_score"], 0.5),
            "topic_id": topic_id.get(r["topic"]),
            "status": "published",
            "published_at": to_dt(r["published_at"]),
        })

        if ctype == ContentType.MCQ:
            mcqs.append({
                "id": uuid.uuid4(),
                "post_id": pid,
                "question": s(r["description"]) or "",
                "options": parse_options(r["options"]) or [],
                "correct_index": to_int(r["correct_index"], 0),
                "explanation": s(r["explanation"]),
            })
        elif ctype == ContentType.FLASHCARD:
            flashcards.append({
                "id": uuid.uuid4(),
                "post_id": pid,
                "front": s(r["front_desc"]) or "",
                "back": s(r["back_desc"]) or "",
                "flip_threshold_sec": to_float(r["flip_threshold_sec"]),
            })

    n_p = await bulk_insert(session, Post, posts)
    n_m = await bulk_insert(session, Mcq, mcqs)
    n_f = await bulk_insert(session, Flashcard, flashcards)
    print(f"  posts: +{n_p}   mcqs: +{n_m}   flashcards: +{n_f}")
    return await ext_map(session, Post), post_type


async def seed_interests(session, user_id, topic_id):
    df = read_csv("knova_interests.csv")
    seen = set()
    rows = []
    for r in df.to_dict("records"):
        u = user_id.get(to_int(r["user_id"]))
        t = topic_id.get(r["topic"])
        if not u or not t or (u, t) in seen:
            continue
        seen.add((u, t))
        rows.append({
            "id": uuid.uuid4(),
            "user_id": u,
            "topic_id": t,
            "affinity_score": to_float(r["weight"], 0.0),
            "source": s(r["source"]),
        })
    n = await bulk_insert(session, UserTopicInterest, rows)
    print(f"  user_topic_interests: +{n}")


async def seed_follows(session, user_id, creator_id):
    df = read_csv("knova_follows.csv")
    seen = set()
    rows = []
    for r in df.to_dict("records"):
        f = user_id.get(to_int(r["user_id"]))
        c = creator_id.get(to_int(r["creator_id"]))
        if not f or not c or (f, c) in seen:
            continue
        seen.add((f, c))
        rows.append({"id": uuid.uuid4(), "follower_id": f, "creator_id": c})
    n = await bulk_insert(session, CreatorFollow, rows)
    print(f"  creator_follows: +{n}")


async def seed_interactions(session, user_id, post_id, post_type):
    count = (await session.execute(select(func.count(Interaction.id)))).scalar() or 0
    if count:
        print(f"  interactions: skipped ({count} already present; use --fresh to reseed)")
        return

    df = read_csv("knova_interactions.csv")
    # interactions is one row per (user, post) — uq_interaction_pair enforces it.
    # The CSV contains ~119 duplicate pairs, so collapse them here, keeping the
    # most engaged one. Same rule the interaction_telemetry migration applies to
    # already-seeded databases.
    best: dict[tuple, dict] = {}
    vote_rows = []
    vote_seen = set()
    for r in df.to_dict("records"):
        u = user_id.get(to_int(r["user_id"]))
        cext = to_int(r["content_id"])
        p = post_id.get(cext)
        if not u or not p:
            continue
        ctype = post_type.get(cext)
        is_mcq = ctype == ContentType.MCQ
        is_card = ctype == ContentType.FLASHCARD
        dwell_ratio = to_float(r["dwell_ratio_actual"], 0.0) or 0.0
        dwell_sec = to_float(r["actual_dwell_sec"], 0.0) or 0.0

        key = (u, p)
        prior = best.get(key)
        if prior is not None and prior["dwell_time_sec"] >= dwell_sec:
            continue

        best[key] = {
            "id": uuid.uuid4(),
            "user_id": u,
            "post_id": p,
            "surface": InteractionSurface.FEED,
            "dwell_time_sec": dwell_sec,
            "completion_ratio": min(1.0, max(0.0, dwell_ratio)),
            "is_completed": dwell_ratio >= 0.9,
            "engagement_weight": to_float(r["engagement_score"], 0.0),
            "quiz_answered": to_bool(r["did_quiz"]) if is_mcq else None,
            "quiz_correct": to_bool(r["quiz_correct"]) if is_mcq else None,
            "card_flipped": to_bool(r["card_flipped"]) if is_card else None,
            "flip_time_sec": to_float(r["flip_time_sec"]) if is_card else None,
            # The generator recorded these at "serve" time, so they are genuine
            # point-in-time snapshots — carry them over rather than letting the
            # export recompute them from current state.
            "is_interest_match": to_bool(r["is_interest_match"]),
            "creator_followed": to_bool(r["creator_followed"]),
            "difficulty_gap": to_float(r["difficulty_gap"]),
            # These were observed interactions, not merely served impressions.
            "view_count": 1,
            "session_dwell_sec": 0.0,
        }

        value = 1 if to_bool(r["upvote"]) else -1 if to_bool(r["downvote"]) else 0
        if value and (u, p) not in vote_seen:
            vote_seen.add((u, p))
            vote_rows.append({"id": uuid.uuid4(), "user_id": u, "post_id": p, "value": value})

    inter_rows = list(best.values())
    n_i = await bulk_insert(session, Interaction, inter_rows)
    n_v = await bulk_insert(session, Vote, vote_rows)
    print(f"  interactions: +{n_i}   votes: +{n_v}")


async def aggregate_counters(session):
    await session.execute(text("""
        UPDATE posts p SET
            upvote_count   = COALESCE(v.up, 0),
            downvote_count = COALESCE(v.down, 0)
        FROM (
            SELECT post_id,
                   COUNT(*) FILTER (WHERE value = 1)  AS up,
                   COUNT(*) FILTER (WHERE value = -1) AS down
            FROM votes GROUP BY post_id
        ) v WHERE p.id = v.post_id
    """))
    await session.execute(text("""
        UPDATE creatorprofiles c SET follower_count = f.cnt
        FROM (SELECT creator_id, COUNT(*) AS cnt FROM creator_follows GROUP BY creator_id) f
        WHERE c.id = f.creator_id
    """))
    await session.commit()
    print("  counters aggregated (post votes, creator followers)")


# --------------------------------------------------------------------------
# Engine / orchestration
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
    clean = urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))  # drop ?sslmode=...
    connect_args = {}
    if host not in ("localhost", "127.0.0.1", ""):
        # Supabase's cert chain fails asyncpg's default full verification
        # ("self-signed certificate in certificate chain"). Encrypt but skip
        # CA/hostname verification — equivalent to libpq sslmode=require. Fine
        # for a one-off dev seed.
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ctx
    return create_async_engine(clean, connect_args=connect_args)


TRUNCATE_SQL = text("""
    TRUNCATE interactions, votes, saved_posts, comments, post_tags, mcqs,
             flashcards, posts, creator_follows, user_topic_interests,
             creatorprofiles, tags, topics, users
    RESTART IDENTITY CASCADE
""")


async def run(url: str, fresh: bool):
    engine = make_engine(url)
    if fresh:
        async with engine.begin() as conn:
            await conn.execute(TRUNCATE_SQL)
        print("  (truncated all seed tables)\n")

    async with AsyncSession(engine) as session:
        print("Seeding...")
        topic_id = await seed_topics_tags(session)
        user_id = await seed_users(session)
        user_id, creator_id = await seed_creators(session, user_id)
        post_id, post_type = await seed_posts(session, topic_id, creator_id)
        await seed_interests(session, user_id, topic_id)
        await seed_follows(session, user_id, creator_id)
        await seed_interactions(session, user_id, post_id, post_type)
        await aggregate_counters(session)
    await engine.dispose()
    print("\nDone.")


def main():
    ap = argparse.ArgumentParser(description="Seed the Knova DB from ml/data/ CSVs.")
    ap.add_argument("--check", action="store_true", help="validate CSVs only, no DB")
    ap.add_argument("--fresh", action="store_true", help="TRUNCATE seed tables before inserting")
    ap.add_argument("--database-url", default=None, help="direct (non-pooler) Postgres URL")
    args = ap.parse_args()

    if args.check:
        sys.exit(0 if validate() else 1)

    url = args.database_url or os.environ.get("SEED_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("No DB URL. Set SEED_DATABASE_URL or pass --database-url (use the DIRECT connection, not the pooler).")

    if not validate():
        sys.exit("CSV validation failed — fix the issues above before seeding.")
    print()
    asyncio.run(run(url, args.fresh))


if __name__ == "__main__":
    main()
