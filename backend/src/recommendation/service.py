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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ml.loader import models
from src.db.models import Post, User
from src.posts.schemas import PostListResponse
from src.posts.service import _load_options, _serialize_post, _user_states
from src.telemetry import tasks as telemetry_tasks

from .features import build_feature_frame
from .ranker import assemble_feed
from .retrieval import CandidateRow, UserContext, load_user_context, retrieve_candidates


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
) -> PostListResponse:
    # Warm-load artifacts on first use (idempotent).
    if not models.is_loaded:
        models.load()

    empty = PostListResponse(items=[], total=0, page=1, size=size, has_next=False)

    ctx = await load_user_context(db, user)
    candidates = await retrieve_candidates(db, ctx)
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
