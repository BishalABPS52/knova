import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.deps import get_db, is_authenticated

from . import service
from .schemas import InteractionAck, InteractionBatch

router = APIRouter(tags=["telemetry"])


@router.post("", response_model=InteractionAck, status_code=status.HTTP_202_ACCEPTED)
async def ingest_interactions(
    batch: InteractionBatch,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated),
):
    """Ingest a flush of client engagement events.

    Dwell values are cumulative-per-session, so this endpoint is idempotent:
    replaying an identical batch bumps `view_count` but leaves the recorded dwell
    unchanged. The client relies on that to retry safely on unload.
    """
    user_id = uuid.UUID(token_payload["sub"])
    accepted, skipped = await service.record_batch(db, user_id, batch)
    return InteractionAck(accepted=accepted, skipped=skipped)
