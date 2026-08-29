import uuid

from fastapi import APIRouter, Cookie, Depends, Response, HTTPException

from sqlalchemy.ext.asyncio import AsyncSession
from src.deps import get_db, is_authenticated
from .schemas import RegisterRequest, LoginRequest, ChangePasswordRequest
from .service import (
    register_user,
    login_user,
    refresh_user_session,
    change_user_password,
)


router = APIRouter(tags=["auth"])


@router.post("/register")
async def register(response: Response, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    return await register_user(response, db, body)


@router.post("/login")
async def login(response: Response, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await login_user(response, db, body)


@router.post("/refresh")
async def refresh(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str = Cookie(default=None),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    return await refresh_user_session(response, db, refresh_token)


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated),
):
    user_id = uuid.UUID(token_payload["sub"])
    await change_user_password(db, user_id, body.current_password, body.new_password)
    return {"detail": "Password updated successfully"}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/api/v1/auth/refresh")
    return {"detail": "Logged out successfully"}
