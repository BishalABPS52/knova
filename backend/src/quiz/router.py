import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from src.deps import get_db

from . import service, tasks
from .llm import LLMError
from .schemas import QuizGenerationAccepted, QuizGenerationResult, TopicQuizResponse

router = APIRouter(tags=["quiz"])


@router.post(
    "/topics/{topic_id}/generate",
    response_model=QuizGenerationAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_topic_quiz(
    topic_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    count: int | None = Query(None, ge=1, le=20, description="defaults to QUIZ_MCQ_PER_TOPIC"),
    force: bool = Query(False, description="generate even if the topic already has MCQs"),
):
    """Re-run generation for an existing topic (the same job topic creation fires)."""
    settings = get_settings()
    background_tasks.add_task(
        tasks.generate_quiz_for_topic, topic_id, count=count, force=force
    )
    return QuizGenerationAccepted(
        topic_ids=[topic_id],
        scheduled=True,
        requested_per_topic=count or settings.QUIZ_MCQ_PER_TOPIC,
        detail="Quiz generation queued; poll GET /quiz/topics/{topic_id} for results.",
    )


@router.post(
    "/topics/{topic_id}/generate-now",
    response_model=QuizGenerationResult,
)
async def generate_topic_quiz_now(
    topic_id: uuid.UUID,
    count: int | None = Query(None, ge=1, le=20),
    force: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """Synchronous generation — blocks on the LLM call. Intended for debugging the
    provider setup, where the failure reason should reach the caller."""
    try:
        return await service.generate_and_store_quiz(
            db, topic_id, count=count, force=force
        )
    except LLMError as exc:
        # Both providers exhausted -> surface it as an upstream failure, not a 500.
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.get("/topics/{topic_id}", response_model=TopicQuizResponse)
async def get_topic_quiz(
    topic_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_topic_quiz(db, topic_id, limit=limit)
