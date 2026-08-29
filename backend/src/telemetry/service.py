"""Telemetry persistence.

Two writers land in the same `interactions` row, and they are deliberately split
by trustworthiness:

  * **The feed, server-side, when a post is SERVED.** Writes the impression with
    `view_count = 0` plus the point-in-time snapshots (interest match, follow
    state, difficulty gap) and the ranking provenance. The client can't be
    trusted with these and shouldn't have to know them.
  * **The client, when the post is actually SEEN.** Writes dwell, scroll depth,
    quiz outcome and flashcard flips, and bumps `view_count`.

Everything merges into one row per (user, post) via `uq_interaction_pair`,
because that is the shape the ML training contract expects.

Derived fields (`completion_ratio`, `is_completed`, `engagement_weight`) are
recomputed set-based after each write rather than maintained incrementally, so
they can never drift from the raw signals they summarise. The weights come from
`ml.constants` so the formula has exactly one definition shared with the
training pipeline and the export.
"""

import logging
import uuid
from uuid import UUID

from sqlalchemy import Float, case, cast, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ml import constants as C
from src.db.models import Interaction, InteractionSurface, Post, User, Vote

from .schemas import InteractionBatch

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# Derived fields
# --------------------------------------------------------------------------

def _recompute_derived(user_id: UUID, post_ids: list[UUID]):
    """UPDATE that rewrites completion_ratio / is_completed / engagement_weight
    for the touched rows from their current raw signals."""
    # est_read_seconds defaults to 0 on Post; NULLIF keeps that from dividing by
    # zero and leaves the ratio NULL, which COALESCE then floors to 0. The cast
    # keeps this float division — without it the integer column infers NUMERIC.
    raw_ratio = Interaction.dwell_time_sec / func.nullif(cast(Post.est_read_seconds, Float), 0.0)
    ratio = func.coalesce(raw_ratio, 0.0)

    # Correlated: the user's current vote on this post, if any.
    vote_value = (
        select(Vote.value)
        .where(Vote.user_id == Interaction.user_id, Vote.post_id == Interaction.post_id)
        .correlate(Interaction)
        .scalar_subquery()
    )
    upvoted = func.coalesce(vote_value, 0) == 1

    capped = func.least(ratio, C.ENGAGEMENT_DWELL_CAP)
    engagement = (
        C.ENGAGEMENT_W_UPVOTE * case((upvoted, 1.0), else_=0.0)
        + C.ENGAGEMENT_W_QUIZ_CORRECT * case((Interaction.quiz_correct.is_(True), 1.0), else_=0.0)
        + C.ENGAGEMENT_W_DWELL * (capped / C.ENGAGEMENT_DWELL_CAP)
        + C.ENGAGEMENT_W_INTEREST * case((Interaction.is_interest_match.is_(True), 1.0), else_=0.0)
    )

    return (
        update(Interaction)
        .where(
            Interaction.user_id == user_id,
            Interaction.post_id.in_(post_ids),
            Post.id == Interaction.post_id,
        )
        .values(
            completion_ratio=func.least(ratio, 1.0),
            is_completed=ratio >= C.COMPLETION_RATIO_THRESHOLD,
            engagement_weight=engagement,
        )
        .execution_options(synchronize_session=False)
    )


def _nudge_expertise(user_id: UUID):
    """Drift User.estimated_expertise toward the user's demonstrated quiz accuracy.

    Called after a telemetry flush that carried a quiz answer. `estimated_expertise`
    is the persisted base_skill_level that feeds both the ranker and the serve-time
    difficulty_gap snapshot — so answering quizzes well raises the difficulty of what
    the feed surfaces. An EWMA step (not a hard set) keeps a single lucky/unlucky
    answer from swinging it. Point-in-time correctness holds: past impression rows
    already froze the value they were served under.
    """
    target = (
        select(func.avg(case((Interaction.quiz_correct.is_(True), 1.0), else_=0.0)))
        .where(Interaction.user_id == user_id, Interaction.quiz_answered.is_(True))
        .scalar_subquery()
    )
    # NULL target (no quiz history yet) coalesces to the current value -> no change.
    target = func.coalesce(target, User.estimated_expertise)
    blended = (
        User.estimated_expertise * (1.0 - C.EXPERTISE_LEARNING_RATE)
        + target * C.EXPERTISE_LEARNING_RATE
    )
    return (
        update(User)
        .where(User.id == user_id)
        .values(estimated_expertise=func.least(1.0, func.greatest(0.0, blended)))
        .execution_options(synchronize_session=False)
    )


def _refresh_post_counters(post_ids: list[UUID]):
    """Recompute the denormalized counters on Post from the interaction rows.

    Derived rather than incremented: an exact count over an indexed post_id for
    at most a batch's worth of posts is cheap, and it cannot drift the way a
    running counter does under retries.
    """
    views = (
        select(func.count())
        .select_from(Interaction)
        .where(Interaction.post_id == Post.id, Interaction.view_count > 0)
        .correlate(Post)
        .scalar_subquery()
    )
    completes = (
        select(func.count())
        .select_from(Interaction)
        .where(Interaction.post_id == Post.id, Interaction.is_completed.is_(True))
        .correlate(Post)
        .scalar_subquery()
    )
    return (
        update(Post)
        .where(Post.id.in_(post_ids))
        .values(
            impression_count=views,
            read_complete_count=completes,
            # Pin updated_at to itself: the column's onupdate would otherwise fire
            # on every telemetry flush, and being viewed is not being edited.
            updated_at=Post.updated_at,
        )
        .execution_options(synchronize_session=False)
    )


# --------------------------------------------------------------------------
# Server-side impressions (written when the feed serves a post)
# --------------------------------------------------------------------------

async def record_impressions(db: AsyncSession, user_id: UUID, rows: list[dict]) -> int:
    """Upsert one impression row per served post.

    `rows` carry post_id, feed_position, rank_source, ranker_score and the three
    snapshots. Re-serving a post refreshes those, but only while the row is still
    unconfirmed (`view_count = 0`) — once the user has actually seen it, the
    snapshot must stay pinned to the impression the engagement belongs to.
    """
    if not rows:
        return 0

    values = [
        {
            "id": uuid.uuid4(),
            "user_id": user_id,
            "post_id": r["post_id"],
            "surface": InteractionSurface.FEED,
            "feed_position": r.get("feed_position"),
            "rank_source": r.get("rank_source"),
            "ranker_score": r.get("ranker_score"),
            "model_version": C.MODEL_VERSION,
            "is_interest_match": r.get("is_interest_match"),
            "creator_followed": r.get("creator_followed"),
            "difficulty_gap": r.get("difficulty_gap"),
            "view_count": 0,
            "dwell_time_sec": 0.0,
            "session_dwell_sec": 0.0,
        }
        for r in rows
    ]

    stmt = pg_insert(Interaction).values(values)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_interaction_pair",
        set_={
            "feed_position": stmt.excluded.feed_position,
            "rank_source": stmt.excluded.rank_source,
            "ranker_score": stmt.excluded.ranker_score,
            "model_version": stmt.excluded.model_version,
            "is_interest_match": stmt.excluded.is_interest_match,
            "creator_followed": stmt.excluded.creator_followed,
            "difficulty_gap": stmt.excluded.difficulty_gap,
        },
        where=Interaction.view_count == 0,
    )
    await db.execute(stmt)
    await db.commit()
    return len(values)


async def ensure_interaction(db: AsyncSession, user_id: UUID, post_id: UUID) -> None:
    """Make sure a row exists for this pair without disturbing an existing one.

    Called from the vote/save paths so engagement from outside the feed still
    produces a training row. Does not commit — the caller owns the transaction.
    """
    stmt = pg_insert(Interaction).values(
        id=uuid.uuid4(),
        user_id=user_id,
        post_id=post_id,
        surface=InteractionSurface.FEED,
        view_count=0,
        dwell_time_sec=0.0,
        session_dwell_sec=0.0,
    )
    await db.execute(stmt.on_conflict_do_nothing(constraint="uq_interaction_pair"))


async def sync_engagement(db: AsyncSession, user_id: UUID, post_id: UUID) -> None:
    """Refresh telemetry after an explicit engagement (vote / save).

    Guarantees a row exists — a vote cast from outside the feed still belongs in
    the training set — then recomputes `engagement_weight`, which depends on the
    user's current vote. Does not commit; the caller owns the transaction.
    """
    await ensure_interaction(db, user_id, post_id)
    # The session is autoflush=False, so a Vote added but not yet flushed would be
    # invisible to the set-based recompute below.
    await db.flush()
    await db.execute(_recompute_derived(user_id, [post_id]))


# --------------------------------------------------------------------------
# Client-reported engagement
# --------------------------------------------------------------------------

async def record_batch(db: AsyncSession, user_id: UUID, batch: InteractionBatch) -> tuple[int, int]:
    """Merge a flush of client events. Returns (accepted, skipped)."""
    # Collapse duplicate post_ids within the batch — the last event wins, since
    # the client's values are cumulative rather than incremental.
    by_post = {e.post_id: e for e in batch.events}

    known = set(
        (
            await db.execute(select(Post.id).where(Post.id.in_(list(by_post))))
        ).scalars().all()
    )
    unknown = set(by_post) - known
    if unknown:
        # Stale ids from a cached page, or mock data leaking through. Drop them
        # rather than failing the whole batch on a foreign key.
        logger.info("telemetry: dropping %d unknown post id(s)", len(unknown))
        for pid in unknown:
            by_post.pop(pid, None)
    if not by_post:
        return 0, len(unknown)

    values = [
        {
            "id": uuid.uuid4(),
            "user_id": user_id,
            "post_id": e.post_id,
            "surface": e.surface,
            "feed_position": e.feed_position,
            "session_id": batch.session_id,
            "session_dwell_sec": e.dwell_sec,
            "dwell_time_sec": e.dwell_sec,
            "scroll_depth": e.scroll_depth,
            "quiz_answered": e.quiz_answered,
            "quiz_correct": e.quiz_correct,
            "card_flipped": e.card_flipped,
            "flip_time_sec": e.flip_time_sec,
            "view_count": 1,
        }
        for e in by_post.values()
    ]

    stmt = pg_insert(Interaction).values(values)
    excluded = stmt.excluded

    # Absolute-not-delta dwell accounting. Within one session the incoming value
    # REPLACES this session's previous contribution, so replaying a flush is a
    # no-op; a new session ADDS to the lifetime total.
    new_dwell = case(
        (
            Interaction.session_id == excluded.session_id,
            Interaction.dwell_time_sec - Interaction.session_dwell_sec + excluded.session_dwell_sec,
        ),
        else_=Interaction.dwell_time_sec + excluded.session_dwell_sec,
    )

    stmt = stmt.on_conflict_do_update(
        constraint="uq_interaction_pair",
        set_={
            "dwell_time_sec": func.greatest(new_dwell, 0.0),
            "session_dwell_sec": excluded.session_dwell_sec,
            "session_id": excluded.session_id,
            "view_count": Interaction.view_count + 1,
            "surface": excluded.surface,
            # Keep the position from the impression that introduced the post.
            "feed_position": func.coalesce(Interaction.feed_position, excluded.feed_position),
            # GREATEST ignores NULLs in Postgres, so this stays monotonic and
            # remains NULL only while both sides are NULL.
            "scroll_depth": func.greatest(Interaction.scroll_depth, excluded.scroll_depth),
            "quiz_answered": or_(
                func.coalesce(Interaction.quiz_answered, False),
                func.coalesce(excluded.quiz_answered, False),
            ),
            "quiz_correct": or_(
                func.coalesce(Interaction.quiz_correct, False),
                func.coalesce(excluded.quiz_correct, False),
            ),
            "card_flipped": or_(
                func.coalesce(Interaction.card_flipped, False),
                func.coalesce(excluded.card_flipped, False),
            ),
            # First flip wins — it's the one that measures time-to-recall.
            "flip_time_sec": func.coalesce(Interaction.flip_time_sec, excluded.flip_time_sec),
            "last_event_at": func.now(),
        },
    )
    await db.execute(stmt)

    post_ids = list(by_post)
    await db.execute(_recompute_derived(user_id, post_ids))
    await db.execute(_refresh_post_counters(post_ids))

    # A quiz answer in this flush is fresh evidence about the user's skill, so let it
    # move their persisted expertise. Recomputed from all quiz history (set-based), not
    # incremented, so it can't drift under retries.
    if any(e.quiz_answered for e in by_post.values()):
        await db.execute(_nudge_expertise(user_id))

    await db.commit()

    return len(post_ids), len(unknown)
