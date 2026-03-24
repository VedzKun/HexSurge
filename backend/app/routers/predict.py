import h3
import redis.asyncio as redis
from fastapi import APIRouter, Depends

from ..dependencies import get_redis
from ..services.zones import resolve_area_name, surge_and_color

router = APIRouter(prefix="/predict", tags=["prediction"])


@router.get("/{lat}/{lng}")
async def predict_zone(lat: float, lng: float, r: redis.Redis = Depends(get_redis)):
    cell = h3.latlng_to_cell(lat, lng, 9)
    count = int(await r.get(f"demand:{cell}") or 0)
    surge_multiplier, heatmap_color, severity = surge_and_color(count)

    riders_needed = 0
    if severity == 1:
        riders_needed = 2
    elif severity == 2:
        riders_needed = max(3, count // 2)

    return {
        "h3_cell": cell,
        "area_name": resolve_area_name(lat, lng),
        "live_demand_score": count,
        "surge_multiplier": surge_multiplier,
        "heatmap_color": heatmap_color,
        "riders_needed": riders_needed,
        "message": "Hot zone detected" if severity == 2 else "Zone stable",
    }
