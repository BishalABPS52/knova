from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class TopicResponse(BaseModel):
    id: UUID
    name: str
    parent_id: UUID | None = None

    model_config = ConfigDict(from_attributes=True)

class TopicCreateRequest(BaseModel):
    name: str
    parent_id: UUID | None = None


class TopicBatchCreateRequest(BaseModel):
    topics: list[TopicCreateRequest] = Field(min_length=1, max_length=50)


class TopicCreateResponse(BaseModel):
    """A created topic plus what the creation kicked off in the background."""
    topic: TopicResponse
    quiz_generation_scheduled: bool = False
    quiz_mcq_requested: int = 0


class TopicBatchCreateResponse(BaseModel):
    created: list[TopicResponse]
    # names that already existed / were invalid, with the reason -> a partial batch
    # still succeeds instead of failing the whole request
    skipped: list[dict[str, str]] = []
    quiz_generation_scheduled: bool = False
    quiz_mcq_requested_per_topic: int = 0
