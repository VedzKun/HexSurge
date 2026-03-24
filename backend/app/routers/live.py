import redis.asyncio as redis
from fastapi import APIRouter, Depends, Query

import h3

from ..dependencies import get_redis
from ..services.zones import surge_and_color
from ..services.zones import resolve_area_name
from ..services.history import aggregate_points_to_h3, load_points_window
from ..services.forecast import predict_next_hour_demand

router = APIRouter(prefix="/live", tags=["live"])


@router.get("/zones")
async def live_zones(
    res: int = Query(9, ge=8, le=10),
    at: int | None = Query(None, description="Epoch seconds for time travel"),
    window_minutes: int = Query(15, ge=1, le=120),
    mode: str = Query("now", pattern="^(now|next_hour)$"),
    r: redis.Redis = Depends(get_redis),
):
    """
    Multi-resolution + time travel + neighbor influence.
    - res: 8/9/10
    - at: if provided, replay demand at that timestamp using a rolling window
    - mode: now vs next_hour prediction view
    """
    zones: list[dict] = []

    # Load points for time travel; otherwise infer "now" from recent window
    if at is None:
        at = int(__import__("time").time())

    points = await load_points_window(r, at_ts=at, window_minutes=window_minutes)
    agg = aggregate_points_to_h3(points, res=res)

    # Neighbor influence (grid_disk) computed on aggregated counts
    counts = {cell: int(v["count"]) for cell, v in agg.items()}
    for cell, meta in agg.items():
        count = int(meta["count"])
        lat = float(meta["lat"])
        lng = float(meta["lng"])

        neighbors = h3.grid_disk(cell, 1)
        neighbor_sum = sum(int(counts.get(n, 0)) for n in neighbors if n != cell)

        # Base "now" surge
        surge_now, color_now, severity_now = surge_and_color(count)

        # Predicted next hour surge (simple + stable)
        cell_int = int(cell, 16) if isinstance(cell, str) else int(cell)
        predicted_score = predict_next_hour_demand(cell_int, live_count=count, neighbor_count=neighbor_sum, at_ts=at)
        surge_pred, color_pred, severity_pred = surge_and_color(int(round(predicted_score)))

        if mode == "next_hour":
            surge_multiplier, heatmap_color, severity = surge_pred, color_pred, severity_pred
            demand_count = int(round(predicted_score))
        else:
            surge_multiplier, heatmap_color, severity = surge_now, color_now, severity_now
            demand_count = count

        zones.append(
            {
                "cell": cell,
                "lat": lat,
                "lng": lng,
                "area_name": resolve_area_name(lat, lng),
                "demand_count": demand_count,
                "surge_multiplier": surge_multiplier,
                "heatmap_color": heatmap_color,
                "severity": severity,
                "neighbor_pressure": neighbor_sum,
                "influenced_by_neighbors": neighbor_sum >= 6 and severity < 2,
                "mode": mode,
                "at": at,
                "res": res,
            }
        )

    zones.sort(key=lambda z: z["demand_count"], reverse=True)
    return {"zones": zones, "res": res, "mode": mode, "at": at, "window_minutes": window_minutes}


@router.get("/stats")
async def live_stats(
    res: int = Query(9, ge=8, le=10),
    at: int | None = Query(None),
    window_minutes: int = Query(15, ge=1, le=120),
    mode: str = Query("now", pattern="^(now|next_hour)$"),
    r: redis.Redis = Depends(get_redis),
):
    zones_payload = await live_zones(res=res, at=at, window_minutes=window_minutes, mode=mode, r=r)
    zones = zones_payload["zones"]

    total_today = int(await r.get("metrics:today_points") or 0)
    hot_zones = [z for z in zones if z["heatmap_color"] == "red"]
    avg_surge = round(sum(z["surge_multiplier"] for z in zones) / max(1, len(zones)), 2)
    riders_needed = sum(max(0, (z["demand_count"] - 6)) for z in hot_zones)

    return {
        "total_live_points_today": total_today,
        "hot_zones_right_now": len(hot_zones),
        "average_surge_multiplier": avg_surge,
        "riders_needed_hot_zones": riders_needed,
        "res": res,
        "mode": mode,
        "at": zones_payload["at"],
        "window_minutes": window_minutes,
    }


@router.get("/rider-suggestions")
async def rider_suggestions(
    res: int = Query(9, ge=8, le=10),
    at: int | None = Query(None),
    window_minutes: int = Query(15, ge=1, le=120),
    r: redis.Redis = Depends(get_redis),
):
    """
    Simple greedy rebalancing suggestions.
    Idea: hot zones need riders; calm zones can spare.
    """
    payload = await live_zones(res=res, at=at, window_minutes=window_minutes, mode="now", r=r)
    zones = payload["zones"]

    need: list[dict] = []
    spare: list[dict] = []
    for z in zones:
        if z["heatmap_color"] == "red":
            need_count = max(1, (z["demand_count"] - 6) // 2)
            need.append({**z, "need": need_count})
        elif z["demand_count"] <= 2:
            spare.append({**z, "spare": 1})

    moves: list[dict] = []
    i = 0
    j = 0
    while i < len(need) and j < len(spare):
        to_zone = need[i]
        from_zone = spare[j]
        qty = min(int(to_zone["need"]), int(from_zone["spare"]))
        if qty > 0:
            moves.append(
                {
                    "from_area": from_zone["area_name"],
                    "to_area": to_zone["area_name"],
                    "riders": qty,
                    "reason": "hot zone demand + neighbor pressure",
                }
            )
            need[i]["need"] -= qty
            spare[j]["spare"] -= qty
        if need[i]["need"] <= 0:
            i += 1
        if spare[j]["spare"] <= 0:
            j += 1

    return {"moves": moves, "res": res, "at": payload["at"], "window_minutes": window_minutes}
