"""Feature construction for candidate posts.

For an unseen (user, post) pair most ranker features can't be reconstructed, so we
fill them with the training medians (as the notebook's _build_feature_rows does) and
compute live only the three signals we can:

  * als_score       — real ALS dot product (falls back to ALS_MEAN when cold)
  * topic_similarity— cosine between the user's interest TF-IDF vector and the post
  * tag_similarity  — Jaccard tag overlap between interest topics and the post's topic

Returns a DataFrame carrying the FEATURES_ALL columns plus per-candidate metadata the
ranker/assembly needs.
"""

import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

from ml import constants as C
from ml.loader import models
from .retrieval import CandidateRow, UserContext
from .user_stats import UserStats


def _content_type_enc(content_type: str) -> float:
    """Encode content_type the way training did (knova_type_encoder.pkl). DB 'text'
    maps to the training label 'text_content'. Falls back to the median on any
    unknown label or a missing encoder."""
    if models.type_encoder is None:
        return C.FEATURE_MEDIANS["content_type_enc"]
    label = C.content_type_train_label(content_type)
    try:
        return float(models.type_encoder.transform([label])[0])
    except (ValueError, KeyError):
        return C.FEATURE_MEDIANS["content_type_enc"]


def _apply_live_features(feat: dict, ctx: UserContext, cand: CandidateRow, stats: UserStats) -> None:
    """Overwrite median-filled features with per-user values, in place.

    Free-win features (no telemetry needed) are always computed. Telemetry-derived
    features are gated on history and otherwise keep their median, so a user with no
    relevant history gets the flag-off feed.
    """
    # -- free wins: computable for every candidate, currently frozen for all users --
    feat["creator_trust"] = 1.0 if cand.followed else 0.0
    feat["content_type_enc"] = _content_type_enc(cand.content_type)
    feat["depth_alignment"] = max(0.0, min(1.0, 1.0 - abs(cand.difficulty - ctx.base_skill_level)))
    feat["base_skill_level"] = ctx.base_skill_level
    feat["curiosity_score"] = ctx.curiosity_score

    # -- telemetry-derived: per-topic --
    tstat = stats.topic(cand.topic)
    if tstat is not None:
        if tstat.interaction_count >= C.MIN_HISTORY:
            feat["user_topic_interaction_count"] = float(tstat.interaction_count)
            if tstat.upvote_rate is not None:
                feat["user_topic_upvote_rate"] = tstat.upvote_rate
        # mastery / kg_readiness respond specifically to quiz performance
        if tstat.quiz_count >= C.MASTERY_MIN_QUIZ and tstat.mastery_score is not None:
            feat["mastery_score"] = tstat.mastery_score
            feat["kg_readiness"] = max(-1.0, min(1.0, tstat.mastery_score - cand.difficulty))

    # -- telemetry-derived: per-content-type z-scores --
    cstat = stats.content_type(cand.content_type)
    if cstat is not None and cstat.count >= C.MIN_HISTORY:
        label = C.content_type_train_label(cand.content_type)
        if cstat.dwell_ratio_mean is not None and label in C.DWELL_MEAN_BY_TYPE:
            clipped = max(C.DWELL_CLIP_FLOOR, min(cstat.dwell_ratio_mean, C.DWELL_CLIP_BY_TYPE[label]))
            feat["dwell_norm_by_type"] = C.zscore_clip(
                clipped, C.DWELL_MEAN_BY_TYPE[label], C.DWELL_STD_BY_TYPE[label]
            )
        if cstat.velocity_mean is not None and label in C.VELOCITY_MEAN_BY_TYPE:
            feat["read_velocity"] = C.zscore_clip(
                cstat.velocity_mean, C.VELOCITY_MEAN_BY_TYPE[label], C.VELOCITY_STD_BY_TYPE[label]
            )
    # similarity_weighted_engagement stays on its median: it needs cross-post TF-IDF
    # over the user's history, which the serve path doesn't have. Tracked as a follow-up.


def _user_interest_vector(ctx: UserContext):
    """Build the user's TF-IDF vector the same way training did: each interest topic
    repeated round(weight*3) times. Returns None if there are no interests or TF-IDF
    isn't loaded."""
    if models.tfidf is None or not ctx.interest_weights:
        return None
    interest_str = " ".join(
        str(topic) * max(1, int(round(weight * C.INTEREST_WEIGHT_REPEAT)))
        for topic, weight in ctx.interest_weights
    )
    if not interest_str.strip():
        return None
    return models.tfidf.transform([interest_str])


def build_feature_frame(
    ctx: UserContext,
    candidates: list[CandidateRow],
    stats: UserStats | None = None,
) -> pd.DataFrame:
    """Build the ranker feature frame for the candidate pool.

    When `stats` is None (LIVE_FEATURES_ENABLED off) the behaviour is unchanged:
    every feature starts from the training median and only als_score /
    topic_similarity / tag_similarity are computed live. When `stats` is provided,
    per-user values overwrite the medians via `_apply_live_features`.
    """
    user_vec = _user_interest_vector(ctx)

    rows = []
    for cand in candidates:
        feat = dict(C.FEATURE_MEDIANS)

        if stats is not None:
            _apply_live_features(feat, ctx, cand, stats)

        # Collaborative filtering
        als = models.als_score(ctx.ext_id, cand.ext_id)
        feat["als_score"] = als if als is not None else C.ALS_MEAN

        # Content similarity (interest TF-IDF vs post)
        idx = models.content_id_to_idx.get(cand.ext_id) if cand.ext_id is not None else None
        if user_vec is not None and idx is not None and models.tfidf_matrix is not None:
            feat["topic_similarity"] = float(
                cosine_similarity(user_vec, models.tfidf_matrix[idx])[0][0]
            )
        else:
            feat["topic_similarity"] = 0.0

        # Tag adjacency
        feat["tag_similarity"] = C.tag_similarity(ctx.interest_topics, cand.topic)

        # metadata carried alongside the features for assembly
        feat["post_id"] = cand.post_id
        feat["ext_id"] = cand.ext_id
        feat["topic"] = cand.topic
        feat["content_type"] = cand.content_type
        feat["tier"] = cand.tier
        feat["followed"] = cand.followed
        feat["published_at"] = cand.published_at
        feat["upvotes"] = cand.upvotes
        feat["downvotes"] = cand.downvotes
        rows.append(feat)

    return pd.DataFrame(rows)
