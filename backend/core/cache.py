"""Async Redis cache helpers for read-heavy endpoints.

Every helper degrades gracefully to a cache miss when Redis is unreachable (or
REDIS_URL is unset): a failed read just hits the DB again and a failed write is
logged and ignored. The cache must never take down the API, so all calls are
guarded with try/except and short timeouts.

To avoid paying a connect timeout on every request while Redis is down, a simple
circuit breaker is used: after any failure the client is short-circuited for a
short cooldown window (cache_get/cache_set return immediately, as a miss), so
the API keeps serving from the DB at full speed instead of pausing each call.
Requests already in flight when the breaker trips still log their own failure,
so expect a small burst of warnings per window rather than exactly one.

Mount points store pre-serialized JSON strings (produced by Pydantic's
`model_dump_json`) so values survive round-tripping with exact field types
(e.g. UUIDs, datetimes). Consumers pair these with `model_validate_json`.

Key conventions:
  - responses are cached under `feed:*`, `posts:*`, `profile:*`, `interests:*`
  - namespace-delete helpers let a write invalidate every key that could
    contain stale data (e.g. a vote invalidates the post + every posts list).
"""

from __future__ import annotations

import contextlib
import logging
import time

from redis.asyncio import Redis

from core.config import get_settings

logger = logging.getLogger(__name__)

# Default TTLs (seconds). Keep small so serving stays reactive to engagement.
FEED_TTL = 10
LIST_TTL = 120
POST_TTL = 300
PROFILE_TTL = 300
INTERESTS_TTL = 300

# Circuit breaker: after a failed Redis op, skip Redis for this many seconds so
# a down/slow instance doesn't stall every request with a connect timeout.
_COOLDOWN_SECS = 30

_redis: Redis | None = None
_cooldown_until = 0.0


def _in_cooldown() -> bool:
    return time.monotonic() < _cooldown_until


async def _mark_down() -> None:
    """Enter the cooldown window and drop the client so its dead pool is rebuilt
    (fresh connection attempt) the next time the cooldown lapses. The old client
    is closed first — dropping the reference alone would orphan its connection
    pool and sockets, leaking one pool per cooldown while Redis stays down.

    Concurrent callers may still hold the closed client, but every call site
    treats an exception as a cache miss, so the worst case is a logged warning.
    """
    global _redis, _cooldown_until
    client, _redis = _redis, None
    _cooldown_until = time.monotonic() + _COOLDOWN_SECS
    if client is not None:
        with contextlib.suppress(Exception):
            await client.aclose()


def get_redis() -> Redis | None:
    """Return the shared async Redis client, or None when Redis is disabled or
    currently cooling down after a failure."""
    global _redis
    if not get_settings().REDIS_URL:
        return None
    if _in_cooldown():
        return None
    if _redis is None:
        # Bounded timeouts so a broken/slow Redis never wedges a request: the
        # circuit breaker means we only pay this connect timeout ~once per
        # cooldown, then fall back to the DB at full speed until it recovers.
        _redis = Redis.from_url(
            get_settings().REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
    return _redis


async def init_redis() -> bool:
    """Establish and verify the shared Redis connection at startup, without
    freezing boot for long: a slow/failed connect just triggers the circuit
    breaker, so serving still works from the DB. Returns True when healthy."""
    if not get_settings().REDIS_URL:
        return False
    client = get_redis()
    if client is None:
        return False
    try:
        await client.ping()
        return True
    except Exception as exc:
        await _mark_down()
        logger.warning("redis init ping failed: %s", exc)
        return False


async def cache_get(key: str) -> str | None:
    """Return the raw cached JSON string, or None on miss / error."""
    client = get_redis()
    if client is None:
        return None
    try:
        return await client.get(key)
    except Exception as exc:
        await _mark_down()
        logger.warning("redis GET %s failed: %s", key, exc)
        return None


async def cache_set(key: str, value: str, ttl: int) -> None:
    """Store a JSON string under `key` with a TTL. Never raises."""
    client = get_redis()
    if client is None:
        return
    try:
        await client.set(key, value, ex=ttl)
    except Exception as exc:
        await _mark_down()
        logger.warning("redis SET %s failed: %s", key, exc)


async def cache_delete(*keys: str) -> None:
    """Delete specific keys. Never raises."""
    client = get_redis()
    if client is None or not keys:
        return
    try:
        await client.delete(*keys)
    except Exception as exc:
        await _mark_down()
        logger.warning("redis DEL failed: %s", exc)


async def cache_delete_prefix(prefix: str) -> None:
    """Delete every key beginning with `prefix`. Used to invalidate whole
    namespaces (e.g. everything for a user under `feed:{user_id}`). Never
    raises."""
    client = get_redis()
    if client is None:
        return
    try:
        async for key in client.scan_iter(match=f"{prefix}*", count=1000):
            await client.delete(key)
    except Exception as exc:
        await _mark_down()
        logger.warning("redis SCAN_AND_DELETE %s* failed: %s", prefix, exc)
