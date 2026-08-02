"""Request/response models for telemetry ingest.

Dwell is reported as an ABSOLUTE cumulative value for the current session, never
as a delta. That is what makes a retried or replayed flush a no-op instead of
double-counting: the server can recompute the lifetime total from
(previous total - this session's last contribution + the new one).
"""

from uuid import UUID

from pydantic import BaseModel, Field

from src.db.models import InteractionSurface


class InteractionEvent(BaseModel):
    post_id: UUID
    surface: InteractionSurface = InteractionSurface.FEED
    feed_position: int | None = Field(default=None, ge=0, le=10_000)

    # Cumulative seconds this post has been visible during THIS session.
    dwell_sec: float = Field(default=0.0, ge=0, le=3600)
    scroll_depth: float | None = Field(default=None, ge=0, le=1)

    quiz_answered: bool | None = None
    quiz_correct: bool | None = None
    card_flipped: bool | None = None
    flip_time_sec: float | None = Field(default=None, ge=0, le=3600)


class InteractionBatch(BaseModel):
    # Client-generated, stable for the lifetime of a browser tab.
    session_id: str = Field(min_length=1, max_length=64)
    events: list[InteractionEvent] = Field(min_length=1, max_length=50)


class InteractionAck(BaseModel):
    """Deliberately thin — the client fires and forgets."""
    accepted: int
    skipped: int = 0
