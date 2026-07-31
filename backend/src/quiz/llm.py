"""Async access to the external LLM providers used for content generation.

Google Gemini (generativelanguage REST) is the primary provider; OpenRouter is the
fallback. A provider is skipped when it has no API key, retried on transient
failures (timeouts, 429/5xx, unparseable JSON), and abandoned in favour of the next
one when it keeps failing. Both APIs are plain HTTPS+JSON, so httpx (already a
dependency) is used directly rather than pulling in two vendor SDKs.

Callers get parsed JSON back; provider-specific envelopes never leak out.
"""

import asyncio
import json
import logging
import re
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

import httpx

from core.config import get_settings

logger = logging.getLogger(__name__)

# Rate limits and transient upstream failures — worth another attempt.
RETRYABLE_STATUS = {408, 425, 429, 500, 502, 503, 504}

_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


class LLMError(RuntimeError):
    """A provider call failed. `retryable` marks failures worth another attempt
    (as opposed to bad keys, bad requests, or safety blocks)."""

    def __init__(self, message: str, *, retryable: bool = False):
        super().__init__(message)
        self.retryable = retryable


@dataclass(slots=True)
class LLMResult:
    data: Any            # parsed JSON (dict or list)
    provider: str        # "google" | "openrouter"
    model: str


async def generate_json(
    system_prompt: str,
    user_prompt: str,
    *,
    response_schema: dict | None = None,
    temperature: float | None = None,
) -> LLMResult:
    """Ask the LLM for a JSON document, trying Google first then OpenRouter.

    Raises LLMError only when every configured provider has been exhausted.
    """
    settings = get_settings()
    temp = settings.LLM_TEMPERATURE if temperature is None else temperature

    providers: list[tuple[str, Callable[..., Awaitable[tuple[str, str]]], str]] = [
        ("google", _call_google, settings.GOOGLE_API_KEY),
        ("openrouter", _call_openrouter, settings.OPENROUTER_API_KEY),
    ]

    failures: list[str] = []
    timeout = httpx.Timeout(settings.LLM_TIMEOUT_SECONDS)

    async with httpx.AsyncClient(timeout=timeout) as client:
        for name, call, api_key in providers:
            if not api_key:
                failures.append(f"{name}: no API key configured")
                continue
            try:
                data, model = await _attempt(
                    name, call, client, system_prompt, user_prompt,
                    response_schema, temp,
                )
            except LLMError as exc:
                logger.warning("LLM provider '%s' unavailable: %s", name, exc)
                failures.append(f"{name}: {exc}")
                continue

            logger.info("LLM response from %s (%s)", name, model)
            return LLMResult(data=data, provider=name, model=model)

    raise LLMError("all LLM providers failed -> " + " | ".join(failures))


async def _attempt(
    name: str,
    call: Callable[..., Awaitable[tuple[str, str]]],
    client: httpx.AsyncClient,
    system_prompt: str,
    user_prompt: str,
    response_schema: dict | None,
    temperature: float,
) -> tuple[Any, str]:
    """Run one provider up to LLM_MAX_ATTEMPTS times with exponential backoff."""
    attempts = max(1, get_settings().LLM_MAX_ATTEMPTS)
    last: LLMError = LLMError(f"{name}: no attempt made")

    for attempt in range(1, attempts + 1):
        try:
            text, model = await call(
                client, system_prompt, user_prompt, response_schema, temperature
            )
            return _parse_json(text), model
        except LLMError as exc:
            last = exc
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            last = LLMError(f"{type(exc).__name__}: {exc}", retryable=True)

        if not last.retryable or attempt == attempts:
            break

        backoff = min(8.0, 0.75 * 2 ** (attempt - 1))
        logger.warning(
            "LLM %s attempt %d/%d failed (%s); retrying in %.1fs",
            name, attempt, attempts, last, backoff,
        )
        await asyncio.sleep(backoff)

    raise last


# Providers
# ---------------------------------------------------------------------------

async def _call_google(
    client: httpx.AsyncClient,
    system_prompt: str,
    user_prompt: str,
    response_schema: dict | None,
    temperature: float,
) -> tuple[str, str]:
    settings = get_settings()
    model = settings.GOOGLE_GENAI_MODEL
    url = f"{settings.GOOGLE_GENAI_BASE_URL.rstrip('/')}/models/{model}:generateContent"

    generation_config: dict[str, Any] = {
        "temperature": temperature,
        "responseMimeType": "application/json",
    }
    if response_schema:
        generation_config["responseSchema"] = response_schema

    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": generation_config,
    }

    response = await client.post(
        url,
        json=payload,
        headers={
            "x-goog-api-key": settings.GOOGLE_API_KEY,
            "Content-Type": "application/json",
        },
    )
    _raise_for_status("google", response)

    body = response.json()
    candidates = body.get("candidates") or []
    if not candidates:
        # Prompt blocked by safety filters -> no candidate is returned at all.
        raise LLMError(f"no candidates returned (feedback={body.get('promptFeedback')})")

    candidate = candidates[0]
    text = "".join(
        part.get("text", "")
        for part in (candidate.get("content", {}).get("parts") or [])
    )
    if not text.strip():
        # e.g. finishReason=MAX_TOKENS or SAFETY mid-generation: retrying can help.
        raise LLMError(
            f"empty completion (finishReason={candidate.get('finishReason')})",
            retryable=True,
        )
    return text, model


async def _call_openrouter(
    client: httpx.AsyncClient,
    system_prompt: str,
    user_prompt: str,
    response_schema: dict | None,   # unused: the prompt carries the JSON contract
    temperature: float,
) -> tuple[str, str]:
    settings = get_settings()
    model = settings.OPENROUTER_MODEL
    url = f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }

    response = await client.post(
        url,
        json=payload,
        headers={
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            # OpenRouter attributes usage to the calling app via these headers.
            "HTTP-Referer": settings.OPENROUTER_APP_URL,
            "X-Title": settings.OPENROUTER_APP_TITLE,
        },
    )
    _raise_for_status("openrouter", response)

    body = response.json()
    # OpenRouter can return a 200 with an error object when the upstream model fails.
    if body.get("error"):
        raise LLMError(f"upstream error: {body['error']}", retryable=True)

    choices = body.get("choices") or []
    if not choices:
        raise LLMError("no choices returned")

    text = (choices[0].get("message") or {}).get("content") or ""
    if not text.strip():
        raise LLMError(
            f"empty completion (finish_reason={choices[0].get('finish_reason')})",
            retryable=True,
        )
    return text, model


# Helpers
# ---------------------------------------------------------------------------

def _raise_for_status(provider: str, response: httpx.Response) -> None:
    if response.status_code < 400:
        return
    detail = response.text[:400].replace("\n", " ")
    raise LLMError(
        f"HTTP {response.status_code}: {detail}",
        retryable=response.status_code in RETRYABLE_STATUS,
    )


def _parse_json(text: str) -> Any:
    """Parse a model completion that is supposed to be JSON, tolerating markdown
    fences and stray prose around the document."""
    cleaned = _FENCE_RE.sub("", text.strip())

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Fall back to the outermost {...} / [...] span in the response.
    for opener, closer in (("{", "}"), ("[", "]")):
        start, end = cleaned.find(opener), cleaned.rfind(closer)
        if start != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                continue

    raise LLMError("completion was not valid JSON", retryable=True)
