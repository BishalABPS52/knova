"""Background entry point for server-side impression logging.

Runs off the request path so telemetry can never slow down or fail a feed
response. Follows the same contract as src/quiz/tasks.py: opens its own session
(the request-scoped one from `get_db` is closed by the time this runs) and
swallows its own errors.
"""

import logging
from uuid import UUID

from src.db.session import AsyncSessionLocal

from . import service

logger = logging.getLogger(__name__)


async def log_impressions(user_id: UUID, rows: list[dict]) -> None:
    """Persist the impressions for one served feed. Never raises."""
    if not rows:
        return

    async with AsyncSessionLocal() as db:
        try:
            await service.record_impressions(db, user_id, rows)
        except Exception:
            await db.rollback()
            logger.exception("failed to log %d impression(s) for user %s", len(rows), user_id)
