from fastapi import APIRouter, BackgroundTasks, Depends, status

from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from src.deps import get_db, is_authenticated
from src.reference import service as ref_service
from src.quiz import tasks as quiz_tasks
from .schemas import (
    TopicBatchCreateRequest,
    TopicBatchCreateResponse,
    TopicCreateRequest,
    TopicCreateResponse,
)


router = APIRouter()

@router.get("/topics")
async def get_topics(limit: int | None = None, db: AsyncSession = Depends(get_db)):
    return await ref_service.list_topics(db, limit)

@router.post("/topics", response_model=TopicCreateResponse, status_code=status.HTTP_201_CREATED)
async def add_topic(
    body: TopicCreateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated),
):
    """Create a topic. MCQ generation for it runs after the response is sent, so
    the caller isn't blocked on the LLM round-trip (see src/quiz/tasks.py).

    Authenticated: creating a topic spends provider credits. The topic list
    (GET) stays public for the onboarding picker."""
    settings = get_settings()
    topic = await ref_service.create_topic(body.name, body.parent_id, db)

    if settings.QUIZ_AUTOGEN_ENABLED:
        background_tasks.add_task(quiz_tasks.generate_quiz_for_topic, topic.id)

    return TopicCreateResponse(
        topic=topic,
        quiz_generation_scheduled=settings.QUIZ_AUTOGEN_ENABLED,
        quiz_mcq_requested=settings.QUIZ_MCQ_PER_TOPIC if settings.QUIZ_AUTOGEN_ENABLED else 0,
    )


@router.post(
    "/topics/batch",
    response_model=TopicBatchCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_topics_batch(
    body: TopicBatchCreateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(is_authenticated),
):
    """Bulk topic creation. Duplicates/invalid parents are reported in `skipped`;
    every newly created topic gets its quiz generated in one background task that
    walks them sequentially."""
    settings = get_settings()
    created, skipped = await ref_service.create_topics_batch(body.topics, db)

    scheduled = bool(created) and settings.QUIZ_AUTOGEN_ENABLED
    if scheduled:
        background_tasks.add_task(
            quiz_tasks.generate_quiz_for_topics, [t.id for t in created]
        )

    return TopicBatchCreateResponse(
        created=created,
        skipped=skipped,
        quiz_generation_scheduled=scheduled,
        quiz_mcq_requested_per_topic=settings.QUIZ_MCQ_PER_TOPIC if scheduled else 0,
    )
