"""Background entry points for quiz generation.

These run off the request path (FastAPI BackgroundTasks) because an LLM round-trip
takes seconds: creating a topic returns immediately and the questions appear once
generation finishes. Each task opens its own DB session — the request-scoped
session from `get_db` is already closed by the time the task runs — and swallows
its own errors so a provider outage can never surface as a failed topic creation.

Single-process by design: a task runs in the app's event loop and dies with the
worker, so an interrupted run is simply re-triggerable via the manual endpoint.
"""

import logging
from uuid import UUID

from core.config import get_settings
from src.db.session import AsyncSessionLocal

from . import service
from .llm import LLMError

logger = logging.getLogger(__name__)


async def generate_quiz_for_topic(
    topic_id: UUID, *, count: int | None = None, force: bool = False
) -> None:
    """Generate and store MCQs for one topic. Never raises."""
    if not get_settings().QUIZ_AUTOGEN_ENABLED:
        logger.info("quiz autogen disabled; skipping topic %s", topic_id)
        return

    async with AsyncSessionLocal() as db:
        try:
            result = await service.generate_and_store_quiz(
                db, topic_id, count=count, force=force
            )
        except LLMError as exc:
            await db.rollback()
            logger.error("quiz generation failed for topic %s: %s", topic_id, exc)
        except Exception:
            await db.rollback()
            logger.exception("unexpected error generating quiz for topic %s", topic_id)
        else:
            if result.skipped:
                logger.info(
                    "quiz generation skipped for '%s': %s", result.topic_name, result.reason
                )


async def generate_quiz_for_topics(
    topic_ids: list[UUID], *, count: int | None = None, force: bool = False
) -> None:
    """Batch variant: topics are processed one at a time so a burst of new topics
    doesn't fan out into concurrent provider calls and trip rate limits."""
    for topic_id in topic_ids:
        await generate_quiz_for_topic(topic_id, count=count, force=force)
