import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.cache import cache_delete_prefix
from src.deps import get_db, is_authenticated

from . import service
from .schemas import FollowingListResponse, FollowResponse

router = APIRouter(tags=["creator"])


async def _invalidate(user_id: uuid.UUID) -> None:
    # The followed-creator retrieval tier depends on the follow graph, and both
    # profiles' follower/following counts changed.
    await cache_delete_prefix(f"feed:{user_id}:")
    await cache_delete_prefix(f"explore:{user_id}:")
    await cache_delete_prefix("profile:")


@router.get("/following", response_model=FollowingListResponse)
async def get_following(
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated),
):
    """Creators the current user follows, newest first."""
    user_id = uuid.UUID(token_payload["sub"])
    return await service.list_following(db, user_id)


@router.post("/{creator_id}/follow", response_model=FollowResponse)
async def follow(
    creator_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated),
):
    user_id = uuid.UUID(token_payload["sub"])
    result = await service.follow_creator(db, user_id, creator_id)
    await _invalidate(user_id)
    return result


@router.delete("/{creator_id}/follow", response_model=FollowResponse)
async def unfollow(
    creator_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated),
):
    user_id = uuid.UUID(token_payload["sub"])
    result = await service.unfollow_creator(db, user_id, creator_id)
    await _invalidate(user_id)
    return result
