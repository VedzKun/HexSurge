# backend/app/routers/ingest.py
from fastapi import APIRouter, Depends
import h3
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.post("/gps/ingest")
async def ingest_gps(
    lat: float, lng: float, company_id: int,
    db: AsyncSession = Depends(get_db),
    r: redis.Redis = Depends(get_redis)
):
    cell = h3.latlng_to_cell(lat, lng, 9)          # res 9 = ~340m
    cell_int = int(cell)                            # store as bigint

    # Store raw ping
    await db.execute("INSERT INTO gps_pings ...")

    # Real-time Redis update (Uber pattern)
    await r.hincrby(f"supply:{cell_int}", company_id, 1)   # live driver count
    await r.expire(f"supply:{cell_int}", 300)              # 5-min window

    # Trigger quick forecast refresh if needed
    return {"h3_cell": cell, "status": "indexed"}