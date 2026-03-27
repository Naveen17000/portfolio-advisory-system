import json
import logging
from typing import Any

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger("portfolio_api")

_redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def close_redis():
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None


async def cache_get(key: str) -> Any | None:
    try:
        client = await get_redis()
        data = await client.get(key)
        if data:
            return json.loads(data)
    except Exception:
        logger.debug("cache_miss", extra={"key": key})
    return None


async def cache_set(key: str, value: Any, ttl: int = 3600):
    try:
        client = await get_redis()
        await client.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception:
        logger.debug("cache_set_failed", extra={"key": key})


async def cache_delete(key: str):
    try:
        client = await get_redis()
        await client.delete(key)
    except Exception:
        pass
