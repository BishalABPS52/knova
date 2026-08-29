from uuid import UUID

from pydantic import BaseModel


class FollowResponse(BaseModel):
    creator_id: UUID
    following: bool
    follower_count: int


class FollowedCreator(BaseModel):
    creator_id: UUID
    user_id: UUID
    username: str
    avatar_url: str | None = None
    headline: str | None = None
    follower_count: int


class FollowingListResponse(BaseModel):
    following: list[FollowedCreator]
    total: int
