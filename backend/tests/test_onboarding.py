"""Onboarding interest-saving tests: name -> Topic resolution, the UserTopicInterest
rows it writes, and the failure modes. No DB (the session is stubbed)."""

import asyncio
import unittest
import uuid

from fastapi import HTTPException

from src.onboarding.service import (
    ONBOARDING_AFFINITY,
    ONBOARDING_SOURCE,
    save_user_interests,
)


class DummyResult:
    """Stands in for a SQLAlchemy Result over a single column."""

    def __init__(self, rows):
        self._rows = list(rows)

    def scalars(self):
        return self

    def all(self):
        return list(self._rows)

    def scalar_one_or_none(self):
        return self._rows[0] if self._rows else None


class DummyDB:
    """Returns queued results in call order: save_user_interests executes the
    Topic lookup first, then the existing-interest lookup."""

    def __init__(self, *results):
        self.added = []
        self.committed = False
        self.refreshed = []
        self._results = list(results)
        self.executed = 0

    async def execute(self, *args, **kwargs):
        self.executed += 1
        return self._results.pop(0) if self._results else DummyResult([])

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.committed = True

    async def refresh(self, obj):
        self.refreshed.append(obj)


class DummyTopic:
    def __init__(self, name):
        self.id = uuid.uuid4()
        self.name = name


class DummyUser:
    def __init__(self):
        self.id = uuid.uuid4()
        self.onboarding_completed = False
        self.last_active_at = None


class OnboardingServiceTests(unittest.TestCase):
    def test_saves_an_interest_row_per_topic_and_completes_onboarding(self):
        physics, math = DummyTopic("Physics"), DummyTopic("Mathematics")
        db = DummyDB(DummyResult([physics, math]), DummyResult([]))
        user = DummyUser()

        asyncio.run(save_user_interests(db, user, ["Physics", "Mathematics"]))

        self.assertEqual(len(db.added), 2)
        self.assertEqual(
            {row.topic_id for row in db.added}, {physics.id, math.id}
        )
        for row in db.added:
            self.assertEqual(row.user_id, user.id)
            self.assertEqual(row.affinity_score, ONBOARDING_AFFINITY)
            self.assertEqual(row.source, ONBOARDING_SOURCE)

        self.assertTrue(user.onboarding_completed)
        self.assertIsNotNone(user.last_active_at)
        self.assertTrue(db.committed)

    def test_resolves_names_case_insensitively_and_dedupes(self):
        physics = DummyTopic("Physics")
        db = DummyDB(DummyResult([physics]), DummyResult([]))

        asyncio.run(
            save_user_interests(db, DummyUser(), ["physics", "  PHYSICS  ", "Physics"])
        )

        self.assertEqual(len(db.added), 1)
        self.assertEqual(db.added[0].topic_id, physics.id)

    def test_is_idempotent_for_already_saved_topics(self):
        physics, math = DummyTopic("Physics"), DummyTopic("Mathematics")
        # physics is already stored for this user -> only math is inserted
        db = DummyDB(DummyResult([physics, math]), DummyResult([physics.id]))

        asyncio.run(save_user_interests(db, DummyUser(), ["Physics", "Mathematics"]))

        self.assertEqual([row.topic_id for row in db.added], [math.id])

    def test_rejects_names_outside_the_topic_vocabulary(self):
        # the picker drifting from the DB vocabulary must fail loudly, not silently
        db = DummyDB(DummyResult([DummyTopic("Physics")]))

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(save_user_interests(db, DummyUser(), ["Physics", "Alchemy"]))

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Alchemy", ctx.exception.detail)
        self.assertFalse(db.added)
        self.assertFalse(db.committed)

    def test_rejects_an_empty_selection(self):
        db = DummyDB()

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(save_user_interests(db, DummyUser(), ["", "   "]))

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(db.executed, 0)


if __name__ == "__main__":
    unittest.main()
