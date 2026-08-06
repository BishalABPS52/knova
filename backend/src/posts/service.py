from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.models import Comment, ContentType, Post, SavedPost, Vote
from src.telemetry import service as telemetry_service
from .schemas import (
    CommentListResponse,
    CommentResponse,
    CreatorBrief,
    FlashcardData,
    McqData,
    PostListResponse,
    PostResponse,
    SaveResponse,
    UserBrief,
)

def _load_options():
    """Relationships every serialized post needs, eager-loaded to avoid N+1 queries."""
    from src.db.models import CreatorProfile

    return (
        selectinload(Post.creator).selectinload(CreatorProfile.user),
        selectinload(Post.tags),
        selectinload(Post.mcq),
        selectinload(Post.flashcard),
    )


def _serialize_post(
    post: Post,
    user_vote: int | None = None,
    user_saved: bool = False,
) -> PostResponse:
    creator = None
    if post.creator is not None and post.creator.user is not None:
        creator = CreatorBrief(
            id=post.creator.id,
            user_id=post.creator.user_id,
            headline=post.creator.headline,
            authority_score=post.creator.authority_score,
            follower_count=post.creator.follower_count,
            user=UserBrief(
                id=post.creator.user.id,
                username=post.creator.user.username,
                avatar_url=post.creator.user.avatar_url,
            ),
        )

    mcq = None
    if post.mcq is not None:
        mcq = McqData(
            question=post.mcq.question,
            options=post.mcq.options,
            correct_index=post.mcq.correct_index,
            explanation=post.mcq.explanation,
        )

    flashcard = None
    if post.flashcard is not None:
        flashcard = FlashcardData(
            front=post.flashcard.front,
            back=post.flashcard.back,
            flip_threshold_sec=post.flashcard.flip_threshold_sec,
        )

    return PostResponse(
        id=post.id,
        creator_id=post.creator_id,
        topic_id=post.topic_id,
        content_type=post.content_type.value,
        title=post.title,
        body=post.body,
        difficulty=post.difficulty,
        status=post.status,
        published_at=post.published_at,
        created_at=post.created_at,
        updated_at=post.updated_at,
        upvote_count=post.upvote_count,
        downvote_count=post.downvote_count,
        comment_count=post.comment_count,
        save_count=post.save_count,
        share_count=post.share_count,
        total_votes=post.upvote_count - post.downvote_count,
        creator=creator,
        tags=[t.name for t in post.tags],
        mcq=mcq,
        flashcard=flashcard,
        user_vote=user_vote,
        user_saved=user_saved,
    )


async def _user_states(
    db: AsyncSession, user_id: UUID | None, post_ids: list[UUID]
) -> tuple[dict[UUID, int], set[UUID]]:
    """Fetch this user's vote value and saved state for the given posts in a single
    batched UNION query (returns empties for anonymous requests)."""
    if not user_id or not post_ids:
        return {}, set()

    vote_q = select(
        Vote.post_id,
        Vote.value,
        literal(1).label("_kind"),
    ).where(Vote.user_id == user_id, Vote.post_id.in_(post_ids))
    saved_q = select(
        SavedPost.post_id,
        literal(None).label("value"),
        literal(2).label("_kind"),
    ).where(SavedPost.user_id == user_id, SavedPost.post_id.in_(post_ids))

    query = vote_q.union_all(saved_q)
    rows = (await db.execute(query)).all()

    votes_map: dict[UUID, int] = {}
    saved_set: set[UUID] = set()
    for post_id, value, kind in rows:
        if kind == 2:
            saved_set.add(post_id)
        else:
            votes_map[post_id] = value

    return votes_map, saved_set


def _order_clause(sort_by: str):
    if sort_by == "top":
        return (Post.upvote_count.desc(), Post.created_at.desc())
    if sort_by == "discussed":
        return (Post.comment_count.desc(), Post.created_at.desc())
    # default: newest first
    return (Post.published_at.desc().nullslast(), Post.created_at.desc())


async def list_posts(
    db: AsyncSession,
    *,
    page: int,
    size: int,
    sort_by: str,
    creator_id: UUID | None,
    topic_id: UUID | None,
    content_type: str | None,
    search: str | None,
    user_id: UUID | None,
) -> PostListResponse:
    filters = [Post.status == "published"]

    if creator_id is not None:
        filters.append(Post.creator_id == creator_id)
    if topic_id is not None:
        filters.append(Post.topic_id == topic_id)
    if content_type is not None:
        try:
            ct = ContentType(content_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid content_type '{content_type}'",
            )
        filters.append(Post.content_type == ct)
    if search:
        like = f"%{search}%"
        filters.append(or_(Post.title.ilike(like), Post.body.ilike(like)))

    total = (
        await db.execute(select(func.count(Post.id)).where(*filters))
    ).scalar() or 0

    result = await db.execute(
        select(Post)
        .where(*filters)
        .options(*_load_options())
        .order_by(*_order_clause(sort_by))
        .offset((page - 1) * size)
        .limit(size)
    )
    posts = result.scalars().all()

    votes_map, saved_set = await _user_states(db, user_id, [p.id for p in posts])
    items = [
        _serialize_post(p, votes_map.get(p.id), p.id in saved_set) for p in posts
    ]

    return PostListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        has_next=page * size < total,
    )


async def get_post(
    db: AsyncSession, post_id: UUID, user_id: UUID | None
) -> PostResponse:
    result = await db.execute(
        select(Post).where(Post.id == post_id).options(*_load_options())
    )
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    votes_map, saved_set = await _user_states(db, user_id, [post.id])
    return _serialize_post(post, votes_map.get(post.id), post.id in saved_set)


async def cast_vote(
    db: AsyncSession, user_id: UUID, post_id: UUID, value: int
) -> PostResponse:
    """Upsert this user's vote and keep the post's denormalized counters in sync.
    Re-sending the current value clears the vote (toggle off)."""
    if value not in (1, -1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="value must be 1 (upvote) or -1 (downvote)",
        )

    post = (
        await db.execute(
            select(Post).where(Post.id == post_id).options(*_load_options())
        )
    ).scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    existing = (
        await db.execute(
            select(Vote).where(Vote.user_id == user_id, Vote.post_id == post_id)
        )
    ).scalar_one_or_none()

    if existing is None:
        db.add(Vote(user_id=user_id, post_id=post_id, value=value))
        if value == 1:
            post.upvote_count += 1
        else:
            post.downvote_count += 1
    elif existing.value == value:
        # same button pressed again -> remove the vote
        await db.delete(existing)
        if value == 1:
            post.upvote_count = max(0, post.upvote_count - 1)
        else:
            post.downvote_count = max(0, post.downvote_count - 1)
    else:
        # switched sides -> move the count from the old side to the new one
        existing.value = value
        if value == 1:
            post.upvote_count += 1
            post.downvote_count = max(0, post.downvote_count - 1)
        else:
            post.downvote_count += 1
            post.upvote_count = max(0, post.upvote_count - 1)

    # A vote is an engagement signal in its own right: make sure it produces a
    # training row even when the post was never served through the feed.
    await telemetry_service.sync_engagement(db, user_id, post_id)

    await db.commit()

    # Mutating the row makes the DB regenerate `updated_at` (onupdate=func.now()),
    # which the commit expires; re-fetch with relationships so serialization never
    # triggers a lazy (sync) load in this async context.
    post = (
        await db.execute(
            select(Post).where(Post.id == post_id).options(*_load_options())
        )
    ).scalar_one()

    votes_map, saved_set = await _user_states(db, user_id, [post.id])
    return _serialize_post(post, votes_map.get(post.id), post.id in saved_set)


async def toggle_save(db: AsyncSession, user_id: UUID, post_id: UUID) -> SaveResponse:
    """Toggle whether this user has the post saved, keeping save_count in sync."""
    post = (
        await db.execute(select(Post).where(Post.id == post_id))
    ).scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    existing = (
        await db.execute(
            select(SavedPost).where(
                SavedPost.user_id == user_id, SavedPost.post_id == post_id
            )
        )
    ).scalar_one_or_none()

    if existing is None:
        db.add(SavedPost(user_id=user_id, post_id=post_id))
        post.save_count += 1
        saved = True
    else:
        await db.delete(existing)
        post.save_count = max(0, post.save_count - 1)
        saved = False

    await telemetry_service.sync_engagement(db, user_id, post_id)

    # Read the counter before commit — commit can expire attributes, and a
    # post-commit read would lazy-load (sync IO) in this async context.
    new_count = post.save_count
    await db.commit()
    return SaveResponse(post_id=post_id, saved=saved, save_count=new_count)


# --------------------------------------------------------------------------
# Comments
# --------------------------------------------------------------------------

def _serialize_comment(
    comment: Comment, replies: list[Comment] | None = None
) -> CommentResponse:
    return CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        parent_comment_id=comment.parent_comment_id,
        body=comment.body,
        created_at=comment.created_at,
        user=UserBrief.model_validate(comment.user) if comment.user else None,
        replies=[_serialize_comment(reply) for reply in (replies or [])],
    )


async def list_comments(
    db: AsyncSession, post_id: UUID, page: int, size: int
) -> CommentListResponse:
    """Newest-first page of top-level comments, each with all of its replies.

    Replies are not paged: threading is one level deep and reply counts are small,
    so a second query for the whole page's children is cheaper than paging them.
    """
    exists = (
        await db.execute(select(Post.id).where(Post.id == post_id))
    ).scalar_one_or_none()
    if exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    top_level = [
        Comment.post_id == post_id,
        Comment.parent_comment_id.is_(None),
    ]
    total = (
        await db.execute(select(func.count()).select_from(Comment).where(*top_level))
    ).scalar_one()

    roots = (
        (
            await db.execute(
                select(Comment)
                .options(selectinload(Comment.user))
                .where(*top_level)
                .order_by(Comment.created_at.desc())
                .offset((page - 1) * size)
                .limit(size)
            )
        )
        .scalars()
        .all()
    )

    replies_by_parent: dict[UUID, list[Comment]] = {}
    if roots:
        replies = (
            (
                await db.execute(
                    select(Comment)
                    .options(selectinload(Comment.user))
                    .where(Comment.parent_comment_id.in_([c.id for c in roots]))
                    .order_by(Comment.created_at.asc())
                )
            )
            .scalars()
            .all()
        )
        for reply in replies:
            replies_by_parent.setdefault(reply.parent_comment_id, []).append(reply)

    return CommentListResponse(
        items=[_serialize_comment(c, replies_by_parent.get(c.id)) for c in roots],
        total=total,
        page=page,
        size=size,
        has_next=(page * size) < total,
    )


async def create_comment(
    db: AsyncSession, user_id: UUID, post_id: UUID, body: str, parent_comment_id: UUID | None
) -> CommentResponse:
    """Add a comment (or a reply) and keep `Post.comment_count` in sync."""
    post = (
        await db.execute(select(Post).where(Post.id == post_id))
    ).scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    if parent_comment_id is not None:
        parent = (
            await db.execute(
                select(Comment).where(
                    Comment.id == parent_comment_id, Comment.post_id == post_id
                )
            )
        ).scalar_one_or_none()
        if parent is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Parent comment not found"
            )
        # Flatten deeper threads onto the top-level ancestor: clients render one
        # level of replies, so a reply-to-a-reply would otherwise be invisible.
        parent_comment_id = parent.parent_comment_id or parent.id

    comment = Comment(
        post_id=post_id, user_id=user_id, parent_comment_id=parent_comment_id, body=body
    )
    db.add(comment)
    post.comment_count += 1

    # A comment is an engagement signal in its own right, like a vote or a save.
    await telemetry_service.sync_engagement(db, user_id, post_id)

    await db.commit()

    # Re-select with the author eager-loaded: the commit expired the instance, and
    # a lazy load of `user` here would be sync IO in an async context.
    created = (
        await db.execute(
            select(Comment).options(selectinload(Comment.user)).where(Comment.id == comment.id)
        )
    ).scalar_one()
    return _serialize_comment(created)


async def delete_comment(db: AsyncSession, user_id: UUID, comment_id: UUID) -> UUID:
    """Delete a comment the caller authored. Returns its post id so the caller can
    invalidate the right caches."""
    comment = (
        await db.execute(select(Comment).where(Comment.id == comment_id))
    ).scalar_one_or_none()
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if comment.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not your comment"
        )

    # Replies cascade in the DB (ondelete="CASCADE"), so they must come off the
    # counter too — count them before the row goes away.
    reply_count = (
        await db.execute(
            select(func.count()).select_from(Comment).where(
                Comment.parent_comment_id == comment_id
            )
        )
    ).scalar_one()

    post_id = comment.post_id
    post = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one()
    await db.delete(comment)
    post.comment_count = max(0, post.comment_count - (1 + reply_count))
    await db.commit()
    return post_id
