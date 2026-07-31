"""Quiz generation tests: response parsing, per-question validation, and the
Google -> OpenRouter fallback. No DB and no network (httpx is mocked)."""

import asyncio
import functools
import json
import unittest

import httpx

from core.config import get_settings
from src.quiz import llm
from src.quiz.schemas import GeneratedMcq
from src.quiz.service import _normalize, _parse_items, _read_seconds

VALID_QUESTION = {
    "question": "Which process converts light energy into chemical energy?",
    "options": ["Photosynthesis", "Respiration", "Osmosis", "Diffusion"],
    "correct_index": 0,
    "explanation": "Chloroplasts capture light and build sugars.",
    "difficulty": "easy",
}


class JsonParsingTests(unittest.TestCase):
    def test_strips_markdown_fence(self):
        self.assertEqual(llm._parse_json('```json\n{"a": 1}\n```'), {"a": 1})

    def test_recovers_object_wrapped_in_prose(self):
        self.assertEqual(llm._parse_json('Sure!\n{"a": [1, 2]}\nHope that helps'), {"a": [1, 2]})

    def test_garbage_raises_retryable_error(self):
        with self.assertRaises(llm.LLMError) as ctx:
            llm._parse_json("not json at all")
        self.assertTrue(ctx.exception.retryable)


class GeneratedMcqTests(unittest.TestCase):
    def test_strips_option_labels_and_normalizes_difficulty(self):
        item = GeneratedMcq.model_validate(
            {**VALID_QUESTION,
             "options": ["A) Photosynthesis", "B) Respiration", "C) Osmosis", "D) Diffusion"],
             "difficulty": "EASY "}
        )
        self.assertEqual(item.options[0], "Photosynthesis")
        self.assertEqual(item.difficulty, "easy")

    def test_unknown_difficulty_becomes_none(self):
        item = GeneratedMcq.model_validate({**VALID_QUESTION, "difficulty": "impossible"})
        self.assertIsNone(item.difficulty)

    def test_rejects_duplicate_options(self):
        with self.assertRaises(Exception):
            GeneratedMcq.model_validate({**VALID_QUESTION, "options": ["a", "A", "b", "c"]})

    def test_rejects_out_of_range_correct_index(self):
        with self.assertRaises(Exception):
            GeneratedMcq.model_validate({**VALID_QUESTION, "correct_index": 9})


class ParseItemsTests(unittest.TestCase):
    def test_drops_bad_items_and_keeps_good_ones(self):
        payload = {"questions": [
            VALID_QUESTION,
            {"question": "dup opts", "options": ["a", "A", "b", "c"], "correct_index": 0},
            {"question": "Index out of range question?", "options": ["a", "b"], "correct_index": 5},
            {"question": "short", "options": ["a", "b", "c", "d"], "correct_index": 0},
            "not-a-dict",
        ]}
        items = _parse_items(payload)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].correct_index, 0)

    def test_accepts_alternate_keys_and_bare_list(self):
        self.assertEqual(len(_parse_items({"mcqs": [VALID_QUESTION]})), 1)
        self.assertEqual(len(_parse_items([VALID_QUESTION])), 1)

    def test_returns_empty_for_unexpected_shape(self):
        self.assertEqual(_parse_items({"answer": "no questions here"}), [])


class HelperTests(unittest.TestCase):
    def test_normalize_ignores_case_and_punctuation(self):
        self.assertEqual(_normalize("What is 2+2?"), _normalize("what   is 2 + 2"))

    def test_read_seconds_has_a_floor(self):
        self.assertGreaterEqual(_read_seconds("q", ["a", "b", "c", "d"]), 20)


class ProviderFallbackTests(unittest.TestCase):
    """Google failing should transparently fall through to OpenRouter."""

    def setUp(self):
        self.settings = get_settings()
        self._keys = (self.settings.GOOGLE_API_KEY, self.settings.OPENROUTER_API_KEY)
        self.settings.GOOGLE_API_KEY = "test-google-key"
        self.settings.OPENROUTER_API_KEY = "test-openrouter-key"
        self._client = httpx.AsyncClient
        self._sleep = llm.asyncio.sleep
        llm.asyncio.sleep = lambda *_: self._sleep(0)   # no real backoff in tests

    def tearDown(self):
        self.settings.GOOGLE_API_KEY, self.settings.OPENROUTER_API_KEY = self._keys
        httpx.AsyncClient = self._client
        llm.asyncio.sleep = self._sleep

    def _mock(self, handler):
        httpx.AsyncClient = functools.partial(
            self._client, transport=httpx.MockTransport(handler)
        )

    def test_falls_back_to_openrouter_when_google_errors(self):
        calls = []

        def handler(request):
            calls.append(str(request.url))
            if "generativelanguage" in str(request.url):
                return httpx.Response(503, text="model overloaded")
            body = json.loads(request.content)
            self.assertEqual(body["response_format"], {"type": "json_object"})
            return httpx.Response(200, json={"choices": [
                {"message": {"content": json.dumps({"questions": [VALID_QUESTION]})}}
            ]})

        self._mock(handler)
        result = asyncio.run(llm.generate_json("sys", "user"))

        self.assertEqual(result.provider, "openrouter")
        self.assertEqual(len(_parse_items(result.data)), 1)
        # the 503 is retried within google before falling through
        google_calls = [c for c in calls if "generativelanguage" in c]
        self.assertEqual(len(google_calls), self.settings.LLM_MAX_ATTEMPTS)

    def test_uses_google_when_it_succeeds(self):
        def handler(request):
            self.assertIn("generativelanguage", str(request.url))
            self.assertEqual(request.headers["x-goog-api-key"], "test-google-key")
            return httpx.Response(200, json={"candidates": [
                {"content": {"parts": [{"text": json.dumps({"questions": [VALID_QUESTION]})}]}}
            ]})

        self._mock(handler)
        result = asyncio.run(llm.generate_json("sys", "user"))
        self.assertEqual(result.provider, "google")

    def test_raises_when_both_providers_fail(self):
        self._mock(lambda request: httpx.Response(500, text="boom"))
        with self.assertRaises(llm.LLMError) as ctx:
            asyncio.run(llm.generate_json("sys", "user"))
        self.assertIn("google", str(ctx.exception))
        self.assertIn("openrouter", str(ctx.exception))

    def test_skips_providers_without_api_keys(self):
        self.settings.GOOGLE_API_KEY = ""
        self.settings.OPENROUTER_API_KEY = ""
        self._mock(lambda request: self.fail("no provider should be called"))
        with self.assertRaises(llm.LLMError) as ctx:
            asyncio.run(llm.generate_json("sys", "user"))
        self.assertIn("no API key", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
