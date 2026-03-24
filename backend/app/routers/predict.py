from fastapi import APIRouter, Depends
import h3
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..dependencies import get_redis
from ..services.forecast import load_model

router = APIRouter(prefix="/predict", tags=["prediction"])

model = load_model()

@router.get("/{lat}/{lng}")
async def predict_zone(
    lat: float,
    lng: float,
    db: AsyncSession = Depends(get_db),
    r: redis.Redis = Depends(get_redis)
):
    cell = h3.latlng_to_cell(lat, lng, 9)
    cell_int = int(cell)

    # Live demand from Redis
    live_supply = await r.hgetall(f"supply:{cell_int}")
    demand_score = sum(int(v) for v in live_supply.values()) if live_supply else 0

    # ML Prediction (placeholder features)
    hour = 14  # you can pass real time later
    features = [[cell_int % 100000, hour, 4, demand_score]]  # dummy features
    ml_pred = model.predict(features)[0]

    # Surge logic
    threshold = 8.0
    surge_multiplier = ml_pred * 1.15 if demand_score > threshold else 1.0
    surge_multiplier = round(float(surge_multiplier), 2)

    color = "red" if surge_multiplier > 1.2 else "orange" if surge_multiplier > 1.05 else "green"

    return {
        "h3_cell": cell,
        "predicted_demand": round(ml_pred, 2),
        "live_demand_score": demand_score,
        "surge_multiplier": surge_multiplier,
        "heatmap_color": color,
        "message": "Hot zone detected!" if surge_multiplier > 1.1 else "Normal operation"
    }