import os
from collections.abc import AsyncGenerator

import redis.asyncio as redis


REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")


async def get_redis() -> AsyncGenerator[redis.Redis, None]:
    client = redis.from_url(REDIS_URL, decode_responses=True)
    try:
        yield client
    finally:
        await client.aclose()
