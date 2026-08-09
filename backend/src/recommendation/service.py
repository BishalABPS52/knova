"""Feed orchestration: retrieve -> build features -> rank -> serialize.

Runs the whole recommendation pipeline in ext_id space, then maps the ranked post
ids back to full Post rows and reuses the posts serializer so the feed response is
identical in shape to the rest of the posts API.

Serving a post is also the moment its impression is logged. Everything the
training export needs but cannot reconstruct later — whether the topic matched
the user's interests, whether they followed the creator, how far the difficulty
sat from their skill — is snapshotted here, because all three drift over time and
recomputing them at export time would leak future state into training rows.
"""

from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ml.loader import models
from src.db.models import Post, Topic, User, UserTopicInterest
from src.posts.schemas import PostListResponse
from src.posts.service import _load_options, _serialize_post, _user_states, list_posts
from src.telemetry import tasks as telemetry_tasks

from .features import build_feature_frame
from .ranker import assemble_feed
from .retrieval import CandidateRow, UserContext, load_user_context, retrieve_candidates
from .schemas import ExploreResponse, TopicSection


def build_impression_rows(
    ctx: UserContext, ranked: list[dict], candidates: list[CandidateRow]
) -> list[dict]:
    """Pair each served slot with the point-in-time context it was served under."""
    by_id: dict[UUID, CandidateRow] = {c.post_id: c for c in candidates}

    rows = []
    for position, item in enumerate(ranked):
        cand = by_id.get(item["post_id"])
        if cand is None:
            continue
        rows.append(
            {
                "post_id": cand.post_id,
                "feed_position": position,
                "rank_source": item.get("source"),
                "ranker_score": item.get("final_score"),
                "is_interest_match": cand.topic in ctx.interest_topics,
                "creator_followed": cand.creator_id in ctx.followed_creator_ids,
                "difficulty_gap": cand.difficulty - ctx.base_skill_level,
            }
        )
    return rows


async def get_feed(
    db: AsyncSession,
    user: User,
    size: int,
    background_tasks: BackgroundTasks | None = None,
    exclude_ids: set[UUID] | None = None,
) -> PostListResponse:
    # Warm-load artifacts on first use (idempotent).
    if not models.is_loaded:
        models.load()

    empty = PostListResponse(items=[], total=0, page=1, size=size, has_next=False)

    ctx = await load_user_context(db, user)
    candidates = await retrieve_candidates(db, ctx, exclude_ids)
    if not candidates:
        return empty

    frame = build_feature_frame(ctx, candidates)
    ranked = assemble_feed(frame, n_ranked=size)
    ordered_ids: list[UUID] = [r["post_id"] for r in ranked]
    if not ordered_ids:
        return empty

    # Log the impressions off the request path. These rows start at view_count=0
    # ("served, not yet confirmed seen") and carry dwell 0, so they neither enter
    # the training export nor trip the qualified-seen filter until the client
    # reports that the post was actually on screen.
    if background_tasks is not None:
        background_tasks.add_task(
            telemetry_tasks.log_impressions,
            user.id,
            build_impression_rows(ctx, ranked, candidates),
        )

    posts = (
        await db.execute(
            select(Post).where(Post.id.in_(ordered_ids)).options(*_load_options())
        )
    ).scalars().all()
    by_id = {p.id: p for p in posts}

    votes_map, saved_set = await _user_states(db, user.id, ordered_ids)
    items = [
        _serialize_post(by_id[pid], votes_map.get(pid), pid in saved_set)
        for pid in ordered_ids
        if pid in by_id
    ]

    return PostListResponse(
        items=items,
        total=len(items),
        page=1,
        size=size,
        has_next=False,
    )


async def _explore_topics(
    db: AsyncSession, user: User, limit: int
) -> list[tuple[UUID, str]]:
    """Pick the topics to build Explore rails for: the user's interests ordered by
    affinity first, then popular topics (by published-post count) as backfill."""
    interest_rows = (
        await db.execute(
            select(Topic.id, Topic.name)
            .join(UserTopicInterest, UserTopicInterest.topic_id == Topic.id)
            .where(UserTopicInterest.user_id == user.id)
            .order_by(UserTopicInterest.affinity_score.desc())
        )
    ).all()

    chosen: list[tuple[UUID, str]] = [(tid, name) for tid, name in interest_rows]
    seen: set[UUID] = {tid for tid, _ in chosen}

    if len(chosen) < limit:
        popular_rows = (
            await db.execute(
                select(Topic.id, Topic.name)
                .join(Post, Post.topic_id == Topic.id)
                .where(Post.status == "published")
                .group_by(Topic.id, Topic.name)
                .order_by(func.count(Post.id).desc())
            )
        ).all()
        for tid, name in popular_rows:
            if tid in seen:
                continue
            chosen.append((tid, name))
            seen.add(tid)
            if len(chosen) >= limit:
                break

    return chosen[:limit]


async def get_explore(
    db: AsyncSession,
    user: User,
    *,
    for_you_size: int,
    topic_size: int,
    topics_limit: int,
    background_tasks: BackgroundTasks | None = None,
) -> ExploreResponse:
    """Explore page payload: the personalized "For You" feed plus per-topic rails.

    The rails are just the existing topic-filtered post list; the feed reuses the
    full ranking pipeline (and its background impression logging) unchanged."""
    feed = await get_feed(db, user, for_you_size, background_tasks)

    topics = await _explore_topics(db, user, topics_limit)

    # Sequential, not gathered: the async session is not safe for concurrent queries.
    sections: list[TopicSection] = []
    for topic_id, topic_name in topics:
        listing = await list_posts(
            db,
            page=1,
            size=topic_size,
            sort_by="top",
            creator_id=None,
            topic_id=topic_id,
            content_type=None,
            search=None,
            user_id=user.id,
        )
        if not listing.items:
            continue
        sections.append(
            TopicSection(
                topic_id=topic_id,
                topic_name=topic_name,
                items=listing.items,
                has_more=listing.has_next,
            )
        )

    return ExploreResponse(for_you=feed.items, topics=sections)
