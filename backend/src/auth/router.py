from fastapi import APIRouter, Cookie, Depends, Response, HTTPException

from sqlalchemy.ext.asyncio import AsyncSession
from src.deps import get_db
from .schemas import RegisterRequest, LoginRequest
from .service import register_user, login_user, refresh_user_session


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
