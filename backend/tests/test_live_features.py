"""Phase 4 live-feature serving: the pure helpers and the median-fallback gating
in build_feature_frame's _apply_live_features. No DB, no ML artifacts (the type
encoder is left unloaded, so content_type_enc falls back to its median)."""

import unittest
import uuid

from ml import constants as C
from src.recommendation.features import _apply_live_features
from src.recommendation.retrieval import CandidateRow, UserContext
from src.recommendation.user_stats import TopicStat, TypeStat, UserStats


def _ctx(*, skill=0.5, curiosity=0.7, followed_ids=None):
    return UserContext(
        user_id=uuid.uuid4(),
        ext_id=1,
        base_skill_level=skill,
        curiosity_score=curiosity,
        interest_topics=set(),
        interest_weights=[],
        followed_creator_ids=followed_ids or set(),
    )


def _cand(*, topic="Machine Learning", content_type="mcq", difficulty=0.5, followed=False, creator_id=None):
    return CandidateRow(
        post_id=uuid.uuid4(),
        ext_id=10,
        topic=topic,
        content_type=content_type,
        creator_authority=0.5,
        upvotes=0,
        downvotes=0,
        published_at=None,
        creator_id=creator_id or uuid.uuid4(),
        difficulty=difficulty,
        followed=followed,
    )


class ZScoreClip(unittest.TestCase):
    def test_basic(self):
        self.assertAlmostEqual(C.zscore_clip(2.0, 1.0, 2.0), 0.5)

    def test_zero_std_returns_zero(self):
        self.assertEqual(C.zscore_clip(5.0, 1.0, 0.0), 0.0)

    def test_clipped_to_bounds(self):
        self.assertEqual(C.zscore_clip(100.0, 0.0, 1.0), C.Z_CLIP)
        self.assertEqual(C.zscore_clip(-100.0, 0.0, 1.0), -C.Z_CLIP)


class BlendExpertise(unittest.TestCase):
    def test_ewma_step(self):
        # old 0.5, target 1.0, lr 0.2 -> 0.6
        self.assertAlmostEqual(C.blend_expertise(0.5, 1.0, 0.2), 0.6)

    def test_clamped(self):
        self.assertEqual(C.blend_expertise(1.0, 5.0, 0.5), 1.0)
        self.assertEqual(C.blend_expertise(0.0, -5.0, 0.5), 0.0)

    def test_no_target_change_when_equal(self):
        self.assertAlmostEqual(C.blend_expertise(0.42, 0.42, 0.2), 0.42)


class ContentTypeLabel(unittest.TestCase):
    def test_text_maps_to_text_content(self):
        self.assertEqual(C.content_type_train_label("text"), "text_content")

    def test_others_identity(self):
        for t in ("mcq", "flashcard", "short_note"):
            self.assertEqual(C.content_type_train_label(t), t)


class FreeWinFeatures(unittest.TestCase):
    def test_creator_trust_from_followed(self):
        feat = dict(C.FEATURE_MEDIANS)
        _apply_live_features(feat, _ctx(), _cand(followed=True), UserStats())
        self.assertEqual(feat["creator_trust"], 1.0)

        feat = dict(C.FEATURE_MEDIANS)
        _apply_live_features(feat, _ctx(), _cand(followed=False), UserStats())
        self.assertEqual(feat["creator_trust"], 0.0)

    def test_depth_alignment(self):
        feat = dict(C.FEATURE_MEDIANS)
        _apply_live_features(feat, _ctx(skill=0.5), _cand(difficulty=0.8), UserStats())
        self.assertAlmostEqual(feat["depth_alignment"], 0.7)  # 1 - |0.8-0.5|

    def test_skill_and_curiosity_passthrough(self):
        feat = dict(C.FEATURE_MEDIANS)
        _apply_live_features(feat, _ctx(skill=0.3, curiosity=0.9), _cand(), UserStats())
        self.assertEqual(feat["base_skill_level"], 0.3)
        self.assertEqual(feat["curiosity_score"], 0.9)


class TelemetryGating(unittest.TestCase):
    def test_below_min_history_keeps_medians(self):
        feat = dict(C.FEATURE_MEDIANS)
        stats = UserStats(
            by_topic={"Machine Learning": TopicStat(interaction_count=1, quiz_count=1,
                                                    upvote_rate=1.0, mastery_score=1.0)},
        )
        _apply_live_features(feat, _ctx(), _cand(topic="Machine Learning"), stats)
        # interaction_count below MIN_HISTORY -> upvote_rate/count untouched...
        self.assertEqual(feat["user_topic_interaction_count"],
                         C.FEATURE_MEDIANS["user_topic_interaction_count"])
        # ...but mastery/kg respond to a single quiz answer (MASTERY_MIN_QUIZ=1)
        self.assertEqual(feat["mastery_score"], 1.0)

    def test_mastery_drives_kg_readiness(self):
        feat = dict(C.FEATURE_MEDIANS)
        stats = UserStats(
            by_topic={"ML": TopicStat(interaction_count=5, quiz_count=4,
                                      upvote_rate=0.5, mastery_score=0.9)},
        )
        _apply_live_features(feat, _ctx(), _cand(topic="ML", difficulty=0.4), stats)
        self.assertEqual(feat["mastery_score"], 0.9)
        self.assertAlmostEqual(feat["kg_readiness"], 0.5)  # 0.9 - 0.4
        self.assertEqual(feat["user_topic_interaction_count"], 5.0)
        self.assertEqual(feat["user_topic_upvote_rate"], 0.5)

    def test_no_quiz_history_leaves_mastery_median(self):
        feat = dict(C.FEATURE_MEDIANS)
        stats = UserStats(
            by_topic={"ML": TopicStat(interaction_count=5, quiz_count=0,
                                      upvote_rate=0.5, mastery_score=None)},
        )
        _apply_live_features(feat, _ctx(), _cand(topic="ML"), stats)
        self.assertEqual(feat["mastery_score"], C.FEATURE_MEDIANS["mastery_score"])
        self.assertEqual(feat["kg_readiness"], C.FEATURE_MEDIANS["kg_readiness"])

    def test_dwell_zscore_applied(self):
        feat = dict(C.FEATURE_MEDIANS)
        stats = UserStats(
            by_type={"mcq": TypeStat(count=4, dwell_ratio_mean=0.647329, velocity_mean=8.121425)},
        )
        _apply_live_features(feat, _ctx(), _cand(content_type="mcq"), stats)
        # mean equals the training per-type mean -> z-score ~0
        self.assertAlmostEqual(feat["dwell_norm_by_type"], 0.0, places=4)
        self.assertAlmostEqual(feat["read_velocity"], 0.0, places=4)


if __name__ == "__main__":
    unittest.main()
