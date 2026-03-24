import json
import time
from dataclasses import dataclass

import h3
import redis.asyncio as redis


@dataclass(frozen=True)
class Point:
    ts: int
    lat: float
    lng: float
    company_id: str


def _day_key(ts: int) -> str:
    return time.strftime("%Y%m%d", time.gmtime(ts))


async def load_points_window(
    r: redis.Redis,
    at_ts: int,
    window_minutes: int = 15,
) -> list[Point]:
    start_ts = max(0, int(at_ts) - int(window_minutes) * 60)
    end_ts = int(at_ts)
    key = f"points:{_day_key(at_ts)}"
    raw = await r.zrangebyscore(key, start_ts, end_ts)
    points: list[Point] = []
    for item in raw:
        try:
            obj = json.loads(item)
            points.append(
                Point(
                    ts=int(obj.get("ts", end_ts)),
                    lat=float(obj["lat"]),
                    lng=float(obj["lng"]),
                    company_id=str(obj.get("company_id", "fleet-a")),
                )
            )
        except Exception:
            continue
    return points


def aggregate_points_to_h3(points: list[Point], res: int) -> dict[str, dict]:
    """
    Aggregate points into H3 cells at a chosen resolution.
    Returns cell -> {count, sample_lat, sample_lng}
    """
    agg: dict[str, dict] = {}
    for p in points:
        cell = h3.latlng_to_cell(p.lat, p.lng, res)
        if cell not in agg:
            agg[cell] = {"count": 0, "lat": p.lat, "lng": p.lng}
        agg[cell]["count"] += 1
    return agg

