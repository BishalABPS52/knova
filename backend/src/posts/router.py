import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.cache import (
    LIST_TTL,
    POST_TTL,
    cache_delete,
    cache_delete_prefix,
    cache_get,
    cache_set,
)
from src.deps import get_db, get_optional_user, is_authenticated
from . import service
from .schemas import (
    CommentCreate,
    CommentListResponse,
    CommentResponse,
    PostListResponse,
    PostResponse,
    SaveResponse,
    VoteRequest,
)

router = APIRouter(tags=["posts"])


def list_cache_key(
    page: int,
    size: int,
    sort_by: str,
    creator_id: uuid.UUID | None,
    topic_id: uuid.UUID | None,
    content_type: str | None,
    search: str | None,
    user_id: uuid.UUID | None,
) -> str:
    scope = user_id if user_id else "anon"
    return (
        f"posts:list:{scope}:{page}:{size}:{sort_by}:{creator_id}:"
        f"{topic_id}:{content_type or ''}:{search or ''}"
    )


def post_cache_key(post_id: uuid.UUID) -> str:
    return f"posts:{post_id}"


async def invalidate_post_related(post_id: uuid.UUID) -> None:
    """A vote/save changes a post's counters and *every* list that shows it, so
    drop the post detail plus all list caches."""
    await cache_delete(post_cache_key(post_id))
    await cache_delete_prefix("posts:list:")


@router.get("", response_model=PostListResponse)
async def list_posts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("new", description="new | top | discussed"),
    creator_id: uuid.UUID | None = None,
    topic_id: uuid.UUID | None = None,
    content_type: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
):
    user_id = uuid.UUID(user["sub"]) if user else None
    key = list_cache_key(
        page, size, sort_by, creator_id, topic_id, content_type, search, user_id
    )
    cached = await cache_get(key)
    if cached is not None:
        return PostListResponse.model_validate_json(cached)

    result = await service.list_posts(
        db,
        page=page,
        size=size,
        sort_by=sort_by,
        creator_id=creator_id,
        topic_id=topic_id,
        content_type=content_type,
        search=search,
        user_id=user_id,
    )
    await cache_set(key, result.model_dump_json(), LIST_TTL)
    return result


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
):
    user_id = uuid.UUID(user["sub"]) if user else None
    # Only the anonymous view is cacheable: personalized (user_vote/user_saved)
    # responses must stay fresh per user.
    if user_id is None:
        key = post_cache_key(post_id)
        cached = await cache_get(key)
        if cached is not None:
            return PostResponse.model_validate_json(cached)
    post = await service.get_post(db, post_id, user_id)
    if user_id is None:
        await cache_set(post_cache_key(post_id), post.model_dump_json(), POST_TTL)
    return post


@router.post("/{post_id}/vote", response_model=PostResponse)
async def vote(
    post_id: uuid.UUID,
    body: VoteRequest,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated),
):
    user_id = uuid.UUID(token_payload["sub"])
    result = await service.cast_vote(db, user_id, post_id, body.value)
    # Vote changes this user's feed ordering AND the post's counts.
    await cache_delete_prefix(f"feed:{user_id}:")
    await cache_delete_prefix(f"explore:{user_id}:")
    await invalidate_post_related(post_id)
    return result


@router.post("/{post_id}/save", response_model=SaveResponse)
async def save(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated),
):
    user_id = uuid.UUID(token_payload["sub"])
    result = await service.toggle_save(db, user_id, post_id)
    await cache_delete_prefix(f"feed:{user_id}:")
    await cache_delete_prefix(f"explore:{user_id}:")
    await invalidate_post_related(post_id)
    return result


@router.get("/{post_id}/comments", response_model=CommentListResponse)
async def list_comments(
    post_id: uuid.UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Comments are public: reading them doesn't require a session."""
    return await service.list_comments(db, post_id, page, size)


@router.post(
    "/{post_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    post_id: uuid.UUID,
    body: CommentCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated),
):
    user_id = uuid.UUID(token_payload["sub"])
    result = await service.create_comment(
        db, user_id, post_id, body.body, body.parent_comment_id
    )
    # comment_count changed, so the post detail and every list showing it are
    # stale; commenting is also an engagement signal, so drop this user's feed.
    await cache_delete_prefix(f"feed:{user_id}:")
    await cache_delete_prefix(f"explore:{user_id}:")
    await invalidate_post_related(post_id)
    return result


# Deleting is keyed by comment id alone, so it lives outside the /posts prefix.
comments_router = APIRouter(tags=["posts"])


@comments_router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated),
):
    user_id = uuid.UUID(token_payload["sub"])
    post_id = await service.delete_comment(db, user_id, comment_id)
    await cache_delete_prefix(f"feed:{user_id}:")
    await cache_delete_prefix(f"explore:{user_id}:")
    await invalidate_post_related(post_id)
