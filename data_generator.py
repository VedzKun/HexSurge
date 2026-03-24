# data_generator.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

np.random.seed(42)
n = 8000
base_lat, base_lng = 13.0827, 80.2707  # Chennai center

df = pd.DataFrame({
    'timestamp': [datetime(2026, 3, 20) + timedelta(minutes=i*3) for i in range(n)],
    'lat': np.random.normal(base_lat, 0.035, n),
    'lng': np.random.normal(base_lng, 0.045, n),
    'order_id': [f"ORD_{i:05d}" for i in range(n)]
})

# Add realistic peak hours (lunch 12-2, dinner 7-9)
df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
df = df[(df['hour'].between(11,14)) | (df['hour'].between(18,22))]

df.to_csv('chennai_orders.csv', index=False)
print("✅ 8,000 synthetic Chennai orders saved!")