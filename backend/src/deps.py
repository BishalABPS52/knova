from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session

from src.db.session import SessionLocal
from core.security import decode_token


def get_db():
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()
        
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