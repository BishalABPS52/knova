from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session
from src.deps import get_db
from .schemas import RegisterRequest, LoginRequest


router = APIRouter(tags=["auth"])


@router.post("/register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    return {}


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    return {}
