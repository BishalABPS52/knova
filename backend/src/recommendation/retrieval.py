"""Candidate retrieval: build the unseen post pool for a user, entirely from the DB.

Tiers (mirrors the notebook's get_unseen_candidates + followed-creator reserve):
  1. followed-creator reserve  — recent unseen posts from creators the user follows
  2. interest tier             — posts whose topic is one of the user's interests
  3. tag-adjacent tier         — posts whose topic is Jaccard-adjacent to an interest
  4. random exploration        — random unseen posts to fill the remaining budget

Only seeded posts (ext_id present) are retrieved for v1: organic posts aren't in the
TF-IDF / ALS artifacts, so they'd score with no similarity/CF signal.
"""

from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID

from sqlalchemy import func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ml import constants as C
from src.db.models import (
    CreatorFollow,
    CreatorProfile,
    Interaction,
    Post,
    Topic,
    User,
    UserTopicInterest,
)


@dataclass
class UserContext:
    user_id: UUID
    ext_id: int | None
    base_skill_level: float
    curiosity_score: float
    interest_topics: set[str]                       # topic names
    interest_weights: list[tuple[str, float]]       # (topic, affinity) for the TF-IDF vector
    followed_creator_ids: set[UUID]                 # CreatorProfile ids


@dataclass
class CandidateRow:
    post_id: UUID
    ext_id: int | None
    topic: str | None
    content_type: str
    creator_authority: float
    upvotes: int
    downvotes: int
    published_at: datetime | None
    creator_id: UUID
    difficulty: float
    tier: str = "random"
    followed: bool = False


async def load_user_context(db: AsyncSession, user: User) -> UserContext:
    interest_rows = (
        await db.execute(
            select(Topic.name, UserTopicInterest.affinity_score)
            .join(Topic, Topic.id == UserTopicInterest.topic_id)
            .where(UserTopicInterest.user_id == user.id)
        )
    ).all()
    interest_weights = [(name, float(w or 0.0)) for name, w in interest_rows]
    interest_topics = {name for name, _ in interest_weights}

    followed = (
        await db.execute(
            select(CreatorFollow.creator_id).where(CreatorFollow.follower_id == user.id)
        )
    ).scalars().all()

    return UserContext(
        user_id=user.id,
        ext_id=user.ext_id,
        base_skill_level=float(user.estimated_expertise if user.estimated_expertise is not None else 0.5),
        curiosity_score=float(user.curiosity_score if user.curiosity_score is not None else 0.5),
        interest_topics=interest_topics,
        interest_weights=interest_weights,
        followed_creator_ids=set(followed),
    )


def _base_columns():
    return (
        Post.id,
        Post.ext_id,
        Topic.name,
        Post.content_type,
        CreatorProfile.authority_score,
        Post.upvote_count,
        Post.downvote_count,
        Post.published_at,
        Post.creator_id,
        Post.difficulty,
    )


def _row(record, tier: str, followed: bool) -> CandidateRow:
    (pid, ext_id, topic, ctype, authority, up, down, pub, creator_id, difficulty) = record[:10]
    return CandidateRow(
        post_id=pid,
        ext_id=int(ext_id) if ext_id is not None else None,
        topic=topic,
        content_type=ctype.value if hasattr(ctype, "value") else str(ctype),
        creator_authority=float(authority or 0.0),
        upvotes=int(up or 0),
        downvotes=int(down or 0),
        published_at=pub,
        creator_id=creator_id,
        difficulty=float(difficulty if difficulty is not None else 0.5),
        tier=tier,
        followed=followed,
    )


async def retrieve_candidates(db: AsyncSession, ctx: UserContext) -> list[CandidateRow]:
    # "Seen" means actually looked at, not merely served. The feed writes an
    # impression row for everything it returns, so filtering on row existence
    # alone would burn a post the user scrolled straight past.
    seen_subq = select(Interaction.post_id).where(
        Interaction.user_id == ctx.user_id,
        or_(
            Interaction.dwell_time_sec >= C.SEEN_DWELL_SEC,
            Interaction.is_completed.is_(True),
            Interaction.quiz_answered.is_(True),
            Interaction.card_flipped.is_(True),
        ),
    )

    def tier_stmt(*, tier, followed, limit, prio, topic_names=None, creator_ids=None, randomize=True):
        """One SELECT for a tier, tagged with literal tier/followed/priority markers
        so the combined UNION result knows each row's provenance. All tiers are
        fetched in a single round trip (this DB is WAN-hosted, so round trips
        dominate)."""
        if limit <= 0:
            return None
        stmt = (
            select(
                *_base_columns(),
                literal(tier).label("_tier"),
                literal(followed).label("_followed"),
                literal(prio).label("_prio"),
            )
            .join(CreatorProfile, CreatorProfile.id == Post.creator_id)
            .outerjoin(Topic, Topic.id == Post.topic_id)
            .where(
                Post.status == "published",
                Post.ext_id.isnot(None),
                Post.id.notin_(seen_subq),
            )
        )
        if topic_names:
            stmt = stmt.where(Topic.name.in_(list(topic_names)))
        if creator_ids:
            stmt = stmt.where(Post.creator_id.in_(list(creator_ids)))
        # followed feed is chronological; other tiers sample randomly for diversity
        if randomize:
            stmt = stmt.order_by(func.random())
        else:
            stmt = stmt.order_by(Post.published_at.desc().nullslast())
        return stmt.limit(limit)

    # 1. Followed-creator reserve (chronological)
    stmts: list = []
    if ctx.followed_creator_ids:
        stmt = tier_stmt(
            tier="followed",
            followed=True,
            prio=0,
            limit=C.FOLLOWED_RESERVE,
            creator_ids=ctx.followed_creator_ids,
            randomize=False,
        )
        if stmt is not None:
            stmts.append(stmt)

    # 2. Interest tier
    if ctx.interest_topics:
        n_interest = round(C.CANDIDATE_POOL_SIZE * C.INTEREST_SHARE)
        stmt = tier_stmt(
            tier="interest",
            followed=False,
            prio=1,
            limit=n_interest,
            topic_names=ctx.interest_topics,
        )
        if stmt is not None:
            stmts.append(stmt)

    # 3. Tag-adjacent tier
    adjacent = C.tag_adjacent_topics(ctx.interest_topics)
    if adjacent:
        n_tag = round(C.CANDIDATE_POOL_SIZE * C.TAG_ADJACENT_SHARE)
        stmt = tier_stmt(
            tier="tag_adjacent",
            followed=False,
            prio=2,
            limit=n_tag,
            topic_names=adjacent,
        )
        if stmt is not None:
            stmts.append(stmt)

    # 4. Random exploration fill
    stmt = tier_stmt(
        tier="random",
        followed=False,
        prio=3,
        limit=C.CANDIDATE_POOL_SIZE,
    )
    if stmt is not None:
        stmts.append(stmt)

    if not stmts:
        return []

    query = stmts[0] if len(stmts) == 1 else stmts[0].union_all(*stmts[1:])
    rows = (await db.execute(query)).all()

    # Tier priority decides who wins a duplicate and who survives the pool cap, so
    # sort by the explicit `_prio` marker: UNION ALL happens to emit rows in branch
    # order today, but Postgres doesn't promise it (a parallel Append could
    # interleave arms). The sort is stable, so each tier keeps its own
    # random()/chronological ordering from the DB.
    rows = sorted(rows, key=lambda rec: rec._prio)

    chosen: dict[UUID, CandidateRow] = {}
    for rec in rows:
        if len(chosen) >= C.CANDIDATE_POOL_SIZE:
            break
        row = _row(rec, rec._tier, bool(rec._followed))
        chosen.setdefault(row.post_id, row)

    return list(chosen.values())
