from uuid import UUID

from pydantic import BaseModel

from src.posts.schemas import PostResponse


class TopicSection(BaseModel):
    """One topic rail on the Explore page."""

    topic_id: UUID
    topic_name: str
    items: list[PostResponse]
    has_more: bool  # more published posts exist for this topic beyond `items`


class ExploreResponse(BaseModel):
    """Explore page payload: the personalized feed plus per-topic rails."""

    for_you: list[PostResponse]
    topics: list[TopicSection]
