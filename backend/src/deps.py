from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import AsyncSessionLocal
from core.security import decode_token


async def get_db():
    async with AsyncSessionLocal() as db:
        yield db
        
def get_cache():
    try:
        cache = []
        yield
    finally:
        pass
    
def is_authenticated(access_token: str | None = Cookie(default=None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Missing or Invalid access token")

    payload = decode_token(access_token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def get_optional_user(access_token: str | None = Cookie(default=None)):
    """Like is_authenticated but never raises: returns the token payload for a
    logged-in user, or None for anonymous requests. Lets public endpoints
    (e.g. the feed) still personalize (user_vote / user_saved) when a valid
    session cookie is present."""
    if not access_token:
        return None
    payload = decode_token(access_token)
    if not payload or payload.get("type") != "access":
        return None
    return payload
