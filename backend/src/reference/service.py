from uuid import UUID

from fastapi import HTTPException, status

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Topic
from .schemas import TopicCreateRequest, TopicResponse

async def list_topics(db: AsyncSession, limit: int | None = None):
    # limit=None returns the full vocabulary (used by the onboarding picker so its
    # options always match the DB/model topic set); a limit caps it when provided.
    stmt = select(Topic).order_by(Topic.name)
    if limit is not None:
        stmt = stmt.limit(limit)

    topics = (await db.execute(stmt)).scalars().all()

    return {
        "topics": [TopicResponse.model_validate(t) for t in topics],
        "total": len(topics),
    }


async def _validate_parent(db: AsyncSession, parent_id: UUID) -> None:
    parent_topic = (await db.execute(
        select(Topic)
        .where(Topic.id == parent_id)
    )).scalar_one_or_none()

    if not parent_topic:
        raise HTTPException(status_code=404, detail="Invalid parent_id")


async def create_topic(name: str, parent_id: UUID | None, db: AsyncSession):
    name = name.strip().title()

    if parent_id:
        await _validate_parent(db, parent_id)

    topic_exists = (await db.execute(
        select(Topic)
        .where(Topic.name == name)
    )).scalar_one_or_none()

    if topic_exists is not None:
        raise HTTPException(status_code=400, detail=f"Topic with name <{name}> already exists")

    topic = Topic(
        name=name,
        parent_id=parent_id
    )
    db.add(topic)
    await db.commit()
    await db.refresh(topic)

    return TopicResponse.model_validate(topic)


async def create_topics_batch(
    items: list[TopicCreateRequest], db: AsyncSession
) -> tuple[list[TopicResponse], list[dict[str, str]]]:
    """Insert many topics in one transaction, reporting per-item failures instead
    of rejecting the whole batch. Returns (created, skipped)."""
    created: list[Topic] = []
    skipped: list[dict[str, str]] = []
    seen: set[str] = set()

    existing_names = set(
        (await db.execute(select(Topic.name))).scalars().all()
    )

    for item in items:
        name = item.name.strip().title()

        if not name:
            skipped.append({"name": item.name, "reason": "empty name"})
            continue
        if name in existing_names or name in seen:
            skipped.append({"name": name, "reason": "already exists"})
            continue
        if item.parent_id:
            try:
                await _validate_parent(db, item.parent_id)
            except HTTPException:
                skipped.append({"name": name, "reason": "invalid parent_id"})
                continue

        seen.add(name)
        topic = Topic(name=name, parent_id=item.parent_id)
        db.add(topic)
        created.append(topic)

    if created:
        await db.commit()
        for topic in created:
            await db.refresh(topic)

    return [TopicResponse.model_validate(t) for t in created], skipped
