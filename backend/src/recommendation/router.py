import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.cache import FEED_TTL, cache_delete_prefix, cache_get, cache_set
from ml import constants as C
from src.db.models import User
from src.deps import get_db, is_authenticated
from src.posts.schemas import PostListResponse
from . import service

router = APIRouter(tags=["feed"])


def feed_cache_key(user_id: uuid.UUID, size: int) -> str:
    return f"feed:{user_id}:{size}"


@router.get("/feed", response_model=PostListResponse)
async def get_feed(
    background_tasks: BackgroundTasks,
    size: int = Query(C.N_RANKED, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated),
):
    """Personalized recommendation feed: interest + tag-adjacent + followed-creator
    retrieval, ALS collaborative filtering, LightGBM ranking, and Thompson-sampled
    exploration. Each call re-runs retrieval excluding already-seen posts, so paging
    is just repeated requests.

    Serving also logs an impression per slot in the background."""
    user = await db.get(User, uuid.UUID(token_payload["sub"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    key = feed_cache_key(user.id, size)
    cached = await cache_get(key)
    if cached is not None:
        return PostListResponse.model_validate_json(cached)

    result = await service.get_feed(db, user, size, background_tasks)
    await cache_set(key, result.model_dump_json(), FEED_TTL)
    return result


async def invalidate_feed(user_id: uuid.UUID) -> None:
    """Drop every cached feed variant for a user (any page size)."""
    await cache_delete_prefix(f"feed:{user_id}:")
