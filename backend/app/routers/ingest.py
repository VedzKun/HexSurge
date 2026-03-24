from fastapi import APIRouter, Depends
import h3
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..dependencies import get_redis

router = APIRouter(prefix="/gps", tags=["ingest"])

@router.post("/ingest")
async def ingest_gps(
    lat: float,
    lng: float,
    company_id: int = 1,
    db: AsyncSession = Depends(get_db),
    r: redis.Redis = Depends(get_redis)
):
    cell = h3.latlng_to_cell(lat, lng, 9)
    cell_int = int(cell)

    # Store in Redis (live supply)
    await r.hincrby(f"supply:{cell_int}", company_id, 1)
    await r.expire(f"supply:{cell_int}", 300)  # 5 minutes

    return {
        "status": "ingested",
        "h3_cell": cell,
        "h3_cell_int": cell_int
    }