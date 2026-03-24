import os
from datetime import datetime, timezone

import joblib

def load_model():
    model_path = "backend/model.pkl"
    if os.path.exists(model_path):
        return joblib.load(model_path)
    else:
        print("⚠️  model.pkl not found — using dummy model")
        class DummyModel:
            def predict(self, X):
                return [6.5] * len(X)   # average demand for Chennai
        return DummyModel()


MODEL = load_model()


def predict_next_hour_demand(cell_int: int, live_count: int, neighbor_count: int, at_ts: int | None = None) -> float:
    """
    Predict demand score for the next hour.
    We keep features intentionally simple for demo stability.
    """
    dt = datetime.fromtimestamp(at_ts or datetime.now(tz=timezone.utc).timestamp(), tz=timezone.utc)
    hour = int(dt.hour)
    dow = int(dt.weekday())
    # Features: stable + lightweight
    features = [[cell_int % 100000, hour, dow, live_count, neighbor_count]]
    try:
        pred = float(MODEL.predict(features)[0])
    except Exception:
        pred = 6.5
    # Blend with live to keep it intuitive
    return max(0.0, 0.55 * pred + 0.45 * float(live_count))