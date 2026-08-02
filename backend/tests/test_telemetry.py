"""Telemetry derivation tests: the engagement formula and the serve-time
snapshot builder. No DB — these are the pure functions either side of the SQL.

The engagement cases are golden values lifted straight out of
ml/data/knova_interactions.csv, so a drift between the live formula and the one
the model was trained on shows up here rather than in a retrain months later.
"""

import unittest
import uuid

from ml import constants as C
from src.recommendation.retrieval import CandidateRow, UserContext
from src.recommendation.service import build_impression_rows


class EngagementScoreTests(unittest.TestCase):
    def test_matches_training_data_row_8212(self):
        """user_id=1, content_id=8212 -> engagement_score 0.32 in the training CSV."""
        score = C.engagement_score(
            upvote=False, quiz_correct=True, dwell_ratio=0.149, is_interest_match=False
        )
        self.assertEqual(round(score, 3), 0.32)

    def test_matches_training_data_row_4551(self):
        """user_id=1, content_id=4551 -> engagement_score 0.042 in the training CSV."""
        score = C.engagement_score(
            upvote=False, quiz_correct=False, dwell_ratio=0.312, is_interest_match=False
        )
        self.assertEqual(round(score, 3), 0.042)

    def test_all_signals_saturate_to_one(self):
        score = C.engagement_score(
            upvote=True, quiz_correct=True, dwell_ratio=1.5, is_interest_match=True
        )
        self.assertAlmostEqual(score, 1.0)

    def test_dwell_is_capped(self):
        """Reading something three times over is not three times the signal."""
        capped = C.engagement_score(dwell_ratio=C.ENGAGEMENT_DWELL_CAP)
        self.assertAlmostEqual(C.engagement_score(dwell_ratio=99.0), capped)
        self.assertAlmostEqual(capped, C.ENGAGEMENT_W_DWELL)

    def test_no_engagement_scores_zero(self):
        self.assertAlmostEqual(C.engagement_score(), 0.0)

    def test_negative_dwell_does_not_go_below_zero(self):
        self.assertAlmostEqual(C.engagement_score(dwell_ratio=-5.0), 0.0)


def _candidate(post_id, *, topic, creator_id, difficulty):
    return CandidateRow(
        post_id=post_id,
        ext_id=1,
        topic=topic,
        content_type="text",
        creator_authority=0.0,
        upvotes=0,
        downvotes=0,
        published_at=None,
        creator_id=creator_id,
        difficulty=difficulty,
    )


class BuildImpressionRowsTests(unittest.TestCase):
    def setUp(self):
        self.followed_creator = uuid.uuid4()
        self.other_creator = uuid.uuid4()
        self.ctx = UserContext(
            user_id=uuid.uuid4(),
            ext_id=1,
            base_skill_level=0.4,
            curiosity_score=0.8,
            interest_topics={"Machine Learning"},
            interest_weights=[("Machine Learning", 1.0)],
            followed_creator_ids={self.followed_creator},
        )

    def test_snapshots_interest_follow_and_difficulty(self):
        pid = uuid.uuid4()
        cand = _candidate(
            pid, topic="Machine Learning", creator_id=self.followed_creator, difficulty=0.7
        )
        ranked = [{"post_id": pid, "source": "ranked", "final_score": 0.9}]

        (row,) = build_impression_rows(self.ctx, ranked, [cand])

        self.assertTrue(row["is_interest_match"])
        self.assertTrue(row["creator_followed"])
        self.assertAlmostEqual(row["difficulty_gap"], 0.7 - 0.4)
        self.assertEqual(row["rank_source"], "ranked")
        self.assertEqual(row["ranker_score"], 0.9)
        self.assertEqual(row["feed_position"], 0)

    def test_non_interest_unfollowed_and_negative_gap(self):
        pid = uuid.uuid4()
        cand = _candidate(
            pid, topic="Cooking & Recipes", creator_id=self.other_creator, difficulty=0.1
        )
        (row,) = build_impression_rows(
            self.ctx, [{"post_id": pid, "source": "backfill", "final_score": 0.1}], [cand]
        )

        self.assertFalse(row["is_interest_match"])
        self.assertFalse(row["creator_followed"])
        # Content easier than the user -> gap is signed, not absolute.
        self.assertAlmostEqual(row["difficulty_gap"], 0.1 - 0.4)

    def test_feed_position_follows_ranked_order(self):
        cands, ranked = [], []
        for i in range(3):
            pid = uuid.uuid4()
            cands.append(
                _candidate(pid, topic="X", creator_id=self.other_creator, difficulty=0.5)
            )
            ranked.append({"post_id": pid, "source": "ranked", "final_score": 1.0 - i})

        rows = build_impression_rows(self.ctx, ranked, cands)

        self.assertEqual([r["feed_position"] for r in rows], [0, 1, 2])
        self.assertEqual([r["post_id"] for r in rows], [r["post_id"] for r in ranked])

    def test_ranked_post_missing_from_candidates_is_skipped(self):
        """Defensive: a slot we can't attribute is dropped rather than written
        with null snapshots that would look like real 'no match' signal."""
        rows = build_impression_rows(
            self.ctx, [{"post_id": uuid.uuid4(), "source": "ranked", "final_score": 1.0}], []
        )
        self.assertEqual(rows, [])


if __name__ == "__main__":
    unittest.main()
