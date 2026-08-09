import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.cache import (
    INTERESTS_TTL,
    PROFILE_TTL,
    cache_delete_prefix,
    cache_get,
    cache_set,
)
from src.deps import get_db, is_authenticated
from .schemas import (
    InterestListResponse,
    InterestUpdateRequest,
    ProfileUpdateRequest,
    UserProfileResponse,
)
from .service import (
    get_user_interests,
    get_user_profile,
    get_user_profile_by_username,
    set_user_interests,
    update_user_profile,
)

router = APIRouter(tags=["users"])


def profile_cache_key(user_id: uuid.UUID) -> str:
    return f"profile:{user_id}"


def username_profile_cache_key(username: str) -> str:
    return f"profile:username:{username.lower()}"


def interests_cache_key(user_id: uuid.UUID) -> str:
    return f"interests:{user_id}"


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated)
):
    user_id = uuid.UUID(token_payload["sub"])
    key = profile_cache_key(user_id)
    cached = await cache_get(key)
    if cached is not None:
        return UserProfileResponse.model_validate_json(cached)
    profile = await get_user_profile(db, user_id)
    await cache_set(key, UserProfileResponse(**profile).model_dump_json(), PROFILE_TTL)
    return profile

@router.get("/{username}", response_model=UserProfileResponse)
async def get_profile_by_username(
    username: str,
    db: AsyncSession = Depends(get_db)
):
    key = username_profile_cache_key(username)
    cached = await cache_get(key)
    if cached is not None:
        return UserProfileResponse.model_validate_json(cached)
    profile = await get_user_profile_by_username(db, username)
    await cache_set(key, UserProfileResponse(**profile).model_dump_json(), PROFILE_TTL)
    return profile

@router.put("/profile", response_model=UserProfileResponse)
async def update_profile(
    body: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated)
):
    user_id = uuid.UUID(token_payload["sub"])
    profile = await update_user_profile(db, user_id, body)
    # Username/bio/avatar may all change here, so drop every profile variant.
    await cache_delete_prefix("profile:")
    return profile


@router.get("/me/interests", response_model=InterestListResponse)
async def get_my_interests(
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated),
):
    user_id = uuid.UUID(token_payload["sub"])
    key = interests_cache_key(user_id)
    cached = await cache_get(key)
    if cached is not None:
        return InterestListResponse.model_validate_json(cached)
    interests = await get_user_interests(db, user_id)
    await cache_set(key, interests.model_dump_json(), INTERESTS_TTL)
    return interests


@router.put("/me/interests", response_model=InterestListResponse)
async def update_my_interests(
    body: InterestUpdateRequest,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated),
):
    user_id = uuid.UUID(token_payload["sub"])
    interests = await set_user_interests(db, user_id, body.interests)
    # Interests drive the personalized feed, so refresh both caches.
    await cache_delete_prefix(interests_cache_key(user_id))
    await cache_delete_prefix(f"feed:{user_id}:")
    await cache_delete_prefix(f"explore:{user_id}:")
    return interests
