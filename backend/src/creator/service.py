from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import CreatorFollow, CreatorProfile, User

from .schemas import FollowedCreator, FollowingListResponse, FollowResponse


async def _get_creator(db: AsyncSession, creator_id: UUID) -> CreatorProfile:
    creator = await db.get(CreatorProfile, creator_id)
    if creator is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Creator not found")
    return creator


async def follow_creator(db: AsyncSession, user_id: UUID, creator_id: UUID) -> FollowResponse:
    creator = await _get_creator(db, creator_id)
    if creator.user_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot follow yourself"
        )

    existing = (
        await db.execute(
            select(CreatorFollow).where(
                CreatorFollow.follower_id == user_id,
                CreatorFollow.creator_id == creator_id,
            )
        )
    ).scalar_one_or_none()

    # Capture the count before commit: reading it afterwards would lazy-load an
    # expired attribute, which blows up in async context.
    count = creator.follower_count or 0
    if existing is None:
        db.add(CreatorFollow(follower_id=user_id, creator_id=creator_id))
        count += 1
        creator.follower_count = count
        await db.commit()

    return FollowResponse(creator_id=creator_id, following=True, follower_count=count)


async def unfollow_creator(db: AsyncSession, user_id: UUID, creator_id: UUID) -> FollowResponse:
    creator = await _get_creator(db, creator_id)

    existing = (
        await db.execute(
            select(CreatorFollow).where(
                CreatorFollow.follower_id == user_id,
                CreatorFollow.creator_id == creator_id,
            )
        )
    ).scalar_one_or_none()

    count = creator.follower_count or 0
    if existing is not None:
        await db.delete(existing)
        count = max(0, count - 1)
        creator.follower_count = count
        await db.commit()

    return FollowResponse(creator_id=creator_id, following=False, follower_count=count)


async def list_following(db: AsyncSession, user_id: UUID) -> FollowingListResponse:
    rows = (
        await db.execute(
            select(CreatorProfile, User)
            .join(CreatorFollow, CreatorFollow.creator_id == CreatorProfile.id)
            .join(User, User.id == CreatorProfile.user_id)
            .where(CreatorFollow.follower_id == user_id)
            .order_by(CreatorFollow.created_at.desc())
        )
    ).all()

    following = [
        FollowedCreator(
            creator_id=creator.id,
            user_id=user.id,
            username=user.username,
            avatar_url=user.avatar_url,
            headline=creator.headline,
            follower_count=creator.follower_count or 0,
        )
        for creator, user in rows
    ]
    return FollowingListResponse(following=following, total=len(following))
