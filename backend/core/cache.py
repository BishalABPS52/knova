"""Async Redis cache helpers for read-heavy endpoints.

Every helper degrades gracefully to a cache miss when Redis is unreachable (or
REDIS_URL is unset): a failed read just hits the DB again and a failed write is
logged and ignored. The cache must never take down the API, so all calls are
guarded with try/except and short timeouts.

Mount points store pre-serialized JSON strings (produced by Pydantic's
`model_dump_json`) so values survive round-tripping with exact field types
(e.g. UUIDs, datetimes). Consumers pair these with `model_validate_json`.

Key conventions:
  - responses are cached under `feed:*`, `posts:*`, `profile:*`, `interests:*`
  - namespace-delete helpers let a write invalidate every key that could
    contain stale data (e.g. a vote invalidates the post + every posts list).
"""

from __future__ import annotations

import logging

from redis.asyncio import Redis

from core.config import get_settings

logger = logging.getLogger(__name__)

# Default TTLs (seconds). Keep small so serving stays reactive to engagement.
FEED_TTL = 60
LIST_TTL = 120
POST_TTL = 300
PROFILE_TTL = 300
INTERESTS_TTL = 300

_redis: Redis | None = None


def get_redis() -> Redis | None:
    """Return the shared async Redis client, or None when Redis is disabled."""
    global _redis
    if not get_settings().REDIS_URL:
        return None
    if _redis is None:
        # Bounded timeouts so a broken/slow Redis never wedges a request: a
        # failed read just falls back to the DB. Connect timeout is generous
        # because cloud instances (e.g. Redis Cloud in ap-south-1) can take
        # >1s on a cold connect, after which pooled commands are ~40ms.
        _redis = Redis.from_url(
            get_settings().REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=2,
        )
    return _redis


async def cache_get(key: str) -> str | None:
    """Return the raw cached JSON string, or None on miss / error."""
    client = get_redis()
    if client is None:
        return None
    try:
        return await client.get(key)
    except Exception:
        logger.warning("redis GET %s failed", key, exc_info=True)
        return None


async def cache_set(key: str, value: str, ttl: int) -> None:
    """Store a JSON string under `key` with a TTL. Never raises."""
    client = get_redis()
    if client is None:
        return
    try:
        await client.set(key, value, ex=ttl)
    except Exception:
        logger.warning("redis SET %s failed", key, exc_info=True)


async def cache_delete(*keys: str) -> None:
    """Delete specific keys. Never raises."""
    client = get_redis()
    if client is None or not keys:
        return
    try:
        await client.delete(*keys)
    except Exception:
        logger.warning("redis DEL %s failed", keys, exc_info=True)


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
    except Exception:
        logger.warning("redis SCAN_AND_DELETE %s* failed", prefix, exc_info=True)