from datetime import datetime, timedelta, UTC

from fastapi import Depends, HTTPException
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import get_settings

settings = get_settings()

SECRET_kEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(raw_password: str) -> str:
    return pwd_context.hash(raw_password)

def verify_password(raw_password: str, hash: str) -> bool:
    return pwd_context.verify(raw_password, hash)


def generate_access_token(sub: str) -> str:
    expire = datetime.now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": sub, "exp": expire, "type": "access"}
    return jwt.encode(payload, SECRET_kEY, algorithm=ALGORITHM)


def generate_access_token(sub: str) -> str:
    expire = datetime.now() + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": sub, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, SECRET_kEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_kEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    
