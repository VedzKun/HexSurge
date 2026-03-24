# backend/app/routers/predict.py
from fastapi import APIRouter, Depends
import h3
import joblib
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db, get_redis
from ..services.forecast import load_model   # we'll create this next

router = APIRouter(prefix="/predict", tags=["prediction"])

# Load the global LightGBM model once when the module loads
model = load_model()   # or joblib.load("model.pkl") if simple

@router.get("/{lat}/{lng}")
async def predict_zone(
    lat: float,
    lng: float,
    db: AsyncSession = Depends(get_db),
    r: redis.Redis = Depends(get_redis)
):
    # 1. Convert lat/lng → H3 cell (res 9 = ~340m, perfect for last-mile)
    cell_str = h3.latlng_to_cell(lat, lng, 9)
    cell_int = int(cell_str)                     # store as bigint in DB/Redis

    # 2. Get live supply/demand from Redis (real-time pulse)
    live_demand = await r.hgetall(f"demand:{cell_int}") or {}
    live_supply = await r.hgetall(f"supply:{cell_int}") or {}
    demand_score = sum(int(v) for v in live_demand.values()) if live_demand else 0

    # 3. Get ML prediction (global model using H3 features)
    # Example features: [cell_int, hour, weekday, neighbor_avg, ...]
    # For now, dummy — replace with real feature vector
    features = [[cell_int % 100000, 14, 4, demand_score]]   # placeholder
    ml_pred = model.predict(features)[0]

    # 4. Calculate surge
    threshold = 8.0
    surge_multiplier = ml_pred * 1.15 if demand_score > threshold else 1.0
    surge_multiplier = round(float(surge_multiplier), 2)

    # 5. Decide heatmap color
    color = "red" if surge_multiplier > 1.2 else "orange" if surge_multiplier > 1.05 else "green"

    return {
        "h3_cell": cell_str,
        "h3_cell_int": cell_int,
        "predicted_demand": round(ml_pred, 2),
        "live_demand_score": demand_score,
        "surge_multiplier": surge_multiplier,
        "heatmap_color": color,
        "message": "Hot zone! More riders needed." if surge_multiplier > 1.1 else "Normal flow"
    }