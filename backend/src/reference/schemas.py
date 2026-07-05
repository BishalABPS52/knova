from uuid import UUID
from pydantic import BaseModel, ConfigDict

class TopicResponse(BaseModel):
    id: UUID
    name: str
    parent_id: str | None = None

    model_config = ConfigDict(from_attributes=True)
    
class TopicCreateRequest(BaseModel):
    name: str
    parent_id: str | None = None