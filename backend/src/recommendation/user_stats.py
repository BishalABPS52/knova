"""Per-user telemetry aggregates for live feature serving (Phase 4).

`build_feature_frame` fills most ranker features from frozen training medians. This
module replaces a subset with values computed from the user's own `interactions`,
so the feed reflects what they've actually engaged with — including their quiz
scores, which drive `mastery_score` and `kg_readiness`.

Two cheap aggregate queries per feed request (one grouped by topic, one by content
type), restricted to confirmed-seen rows (`view_count > 0`). Everything is gated on
a minimum history in `build_feature_frame`; below it a feature falls back to its
median, so a brand-new user's feed is byte-for-byte the flag-off feed.
"""

from dataclasses import dataclass, field
from uuid import UUID

from sqlalchemy import Float, case, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Interaction, Post, Topic


@dataclass
class TopicStat:
    interaction_count: int
    quiz_count: int
    upvote_rate: float | None       # mean(upvoted) over the user's topic interactions
    mastery_score: float | None     # mean(quiz_correct) over quiz-answered rows


@dataclass
class TypeStat:
    count: int
    dwell_ratio_mean: float | None  # mean(dwell_time / est_read_seconds)
    velocity_mean: float | None     # mean(word_count / dwell_time)


@dataclass
class UserStats:
    by_topic: dict[str, TopicStat] = field(default_factory=dict)
    by_type: dict[str, TypeStat] = field(default_factory=dict)  # keyed by DB content_type

    def topic(self, name: str | None) -> TopicStat | None:
        return self.by_topic.get(name) if name is not None else None

    def content_type(self, ctype: str | None) -> TypeStat | None:
        return self.by_type.get(ctype) if ctype is not None else None


EMPTY_STATS = UserStats()


async def load_user_stats(db: AsyncSession, user_id: UUID) -> UserStats:
    """Aggregate the user's confirmed-seen interactions into per-topic / per-type stats."""
    # --- per topic ---
    # upvote_rate mirrors training's user_topic_upvote_rate: the mean of the 0/1 upvote
    # flag over the user's topic interactions. Left-join votes so a non-voted interaction
    # counts as 0, exactly as the training `upvote` column does.
    from src.db.models import Vote

    quiz_correct_num = case((Interaction.quiz_correct.is_(True), 1.0), else_=0.0)
    upvote_num = case((Vote.value == 1, 1.0), else_=0.0)

    topic_rows = (
        await db.execute(
            select(
                Topic.name,
                func.count().label("interaction_count"),
                func.count().filter(Interaction.quiz_answered.is_(True)).label("quiz_count"),
                func.avg(upvote_num).label("upvote_rate"),
                func.avg(quiz_correct_num).filter(Interaction.quiz_answered.is_(True)).label("mastery"),
            )
            .select_from(Interaction)
            .join(Post, Post.id == Interaction.post_id)
            .join(Topic, Topic.id == Post.topic_id)
            .outerjoin(Vote, (Vote.user_id == Interaction.user_id) & (Vote.post_id == Interaction.post_id))
            .where(Interaction.user_id == user_id, Interaction.view_count > 0)
            .group_by(Topic.name)
        )
    ).all()

    by_topic = {
        name: TopicStat(
            interaction_count=int(cnt or 0),
            quiz_count=int(qcnt or 0),
            upvote_rate=float(up) if up is not None else None,
            mastery_score=float(mastery) if mastery is not None else None,
        )
        for name, cnt, qcnt, up, mastery in topic_rows
    }

    # --- per content type ---
    est = func.nullif(cast(Post.est_read_seconds, Float), 0.0)
    dwell = func.nullif(Interaction.dwell_time_sec, 0.0)
    dwell_ratio = Interaction.dwell_time_sec / est
    velocity = cast(Post.word_count, Float) / dwell

    type_rows = (
        await db.execute(
            select(
                Post.content_type,
                func.count().label("count"),
                func.avg(dwell_ratio).label("dwell_ratio_mean"),
                func.avg(velocity).label("velocity_mean"),
            )
            .select_from(Interaction)
            .join(Post, Post.id == Interaction.post_id)
            .where(Interaction.user_id == user_id, Interaction.view_count > 0)
            .group_by(Post.content_type)
        )
    ).all()

    by_type = {
        (ctype.value if hasattr(ctype, "value") else str(ctype)): TypeStat(
            count=int(cnt or 0),
            dwell_ratio_mean=float(dr) if dr is not None else None,
            velocity_mean=float(v) if v is not None else None,
        )
        for ctype, cnt, dr, v in type_rows
    }

    return UserStats(by_topic=by_topic, by_type=by_type)
