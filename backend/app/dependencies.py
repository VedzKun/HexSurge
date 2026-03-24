import redis.asyncio as redis
import os
from fastapi import Depends

async def get_redis():
    r = redis.from_url(os.getenv("REDIS_URL"))
    try:
        yield r
    finally:
        await r.close()