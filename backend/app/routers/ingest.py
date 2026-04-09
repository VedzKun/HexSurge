from datetime import datetime
import json
import time
import uuid

import h3
import redis.asyncio as redis
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional

from ..dependencies import get_redis
from ..services.zones import resolve_area_name, surge_and_color

router = APIRouter(prefix="/gps", tags=["ingest"])


class IngestPoint(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    company_id: str = Field(..., min_length=1, max_length=64)
    # Added for Driver View: optional driver_id for tracking individual drivers
    driver_id: Optional[str] = Field(None, min_length=1, max_length=64)
    # Optional delivery event type
    event: Optional[str] = Field(None, max_length=32)


DINNER_RUSH_POINTS = [
    (12.9815, 80.2180, "fleet-a"), (12.9822, 80.2201, "fleet-a"), (12.9788, 80.2160, "fleet-b"),
    (13.0104, 80.2206, "fleet-a"), (13.0120, 80.2234, "fleet-c"), (13.0091, 80.2183, "fleet-b"),
    (12.9635, 80.2411, "fleet-c"), (12.9651, 80.2442, "fleet-b"), (12.9608, 80.2398, "fleet-a"),
    (12.9249, 80.1000, "fleet-a"), (12.9270, 80.1021, "fleet-c"), (12.9227, 80.0987, "fleet-b"),
    (13.0418, 80.2341, "fleet-a"), (13.0430, 80.2360, "fleet-c"), (13.0399, 80.2331, "fleet-b"),
    (12.9170, 80.2300, "fleet-c"), (12.9189, 80.2320, "fleet-b"), (12.9157, 80.2284, "fleet-a"),
    (13.0012, 80.2565, "fleet-a"), (12.9994, 80.2542, "fleet-c"),
]

# Driver location TTL: 10 minutes (if no ping within 10m → driver goes offline)
DRIVER_TTL = 60 * 10


async def _store_point(
    r: redis.Redis,
    lat: float,
    lng: float,
    company_id: str,
    driver_id: Optional[str] = None,
    event: Optional[str] = None,
):
    ts = int(time.time())
    cell = h3.latlng_to_cell(lat, lng, 9)
    key = f"demand:{cell}"
    await r.incr(key)
    await r.expire(key, 60 * 60 * 6)
    area = resolve_area_name(lat, lng)
    await r.hset(
        f"zone:{cell}",
        mapping={"lat": str(lat), "lng": str(lng), "area_name": area},
    )
    await r.expire(f"zone:{cell}", 60 * 60 * 6)
    await r.sadd("active_cells", cell)
    await r.incr("metrics:today_points")
    await r.hincrby("metrics:companies", company_id, 1)

    # Historical replay storage (time travel)
    day_key = time.strftime("%Y%m%d", time.gmtime(ts))
    history_key = f"points:{day_key}"
    payload = json.dumps(
        {
            "id": str(uuid.uuid4()),
            "ts": ts,
            "lat": lat,
            "lng": lng,
            "company_id": company_id,
        }
    )
    await r.zadd(history_key, {payload: ts})
    await r.expire(history_key, 60 * 60 * 48)  # keep 2 days for replay

    # ── Added for Driver View: store driver location in Redis with TTL ──
    if driver_id:
        driver_key = f"driver:{driver_id}"
        await r.hset(
            driver_key,
            mapping={
                "driver_id": driver_id,
                "lat": str(lat),
                "lng": str(lng),
                "h3_cell": cell,
                "area_name": area,
                "last_seen": ts,
                "event": event or "checkin",
            },
        )
        await r.expire(driver_key, DRIVER_TTL)
        # Track active driver set
        await r.sadd("active_drivers", driver_id)
        await r.expire("active_drivers", DRIVER_TTL + 60)

    count = int(await r.get(key) or 0)
    surge, color, _ = surge_and_color(count)
    return cell, count, surge, color, area


@router.post("/ingest")
async def ingest_gps(payload: IngestPoint, r: redis.Redis = Depends(get_redis)):
    cell, count, surge, color, area = await _store_point(
        r,
        payload.lat,
        payload.lng,
        payload.company_id,
        driver_id=payload.driver_id,
        event=payload.event,
    )
    return {
        "status": "ingested",
        "timestamp": datetime.utcnow().isoformat(),
        "h3_cell": cell,
        "area_name": area,
        "live_count": count,
        "surge_multiplier": surge,
        "heatmap_color": color,
    }


@router.post("/simulate-dinner-rush")
async def simulate_dinner_rush(
    count: int = Query(20, ge=1, le=20),
    r: redis.Redis = Depends(get_redis),
):
    for lat, lng, company_id in DINNER_RUSH_POINTS[:count]:
        await _store_point(r, lat, lng, company_id)
    return {"status": "ok", "inserted": count, "message": f"Dinner rush simulated with {count} points"}


# ── Added for Driver View: list all active drivers ──
@router.get("/drivers")
async def list_drivers(r: redis.Redis = Depends(get_redis)):
    """
    Returns all drivers who have pinged within the last DRIVER_TTL seconds.
    Used by admin dashboard to show live driver positions.
    """
    driver_ids = await r.smembers("active_drivers")
    drivers = []
    for did in driver_ids:
        key = f"driver:{did}"
        data = await r.hgetall(key)
        if data:
            drivers.append({
                "driver_id": data.get("driver_id", did),
                "lat": float(data.get("lat", 0)),
                "lng": float(data.get("lng", 0)),
                "h3_cell": data.get("h3_cell", ""),
                "area_name": data.get("area_name", "—"),
                "last_seen": int(data.get("last_seen", 0)),
                "event": data.get("event", "checkin"),
            })
        else:
            # Key expired but still in set — clean up
            await r.srem("active_drivers", did)

    drivers.sort(key=lambda d: d["last_seen"], reverse=True)
    return {"drivers": drivers, "count": len(drivers)}
