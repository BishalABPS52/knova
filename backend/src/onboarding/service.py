from sqlalchemy.orm import Session

from src.db.models import User


def save_user_interests(
    user: User,
    interests: list[str],
):
    user.interests = interests