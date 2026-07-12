import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.deps import get_db, is_authenticated
from src.db.models import User
from .schemas import UserProfileResponse, ProfileUpdateRequest
from .service import get_user_profile, update_user_profile

router = APIRouter(tags=["users"])

@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated)
):
    user_id = token_payload["sub"]
    user = await db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return await get_user_profile(db, user.username)

@router.get("/{username}", response_model=UserProfileResponse)
async def get_profile_by_username(
    username: str,
    db: AsyncSession = Depends(get_db)
):
    return await get_user_profile(db, username)

@router.put("/profile", response_model=UserProfileResponse)
async def update_profile(
    body: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated)
):
    user_id = uuid.UUID(token_payload["sub"])
    return await update_user_profile(db, user_id, body)
