import pandas as pd
import numpy as np
from datetime import datetime, timedelta

np.random.seed(42)
n = 5000
base_lat, base_lng = 13.0827, 80.2707

df = pd.DataFrame({
    'timestamp': [datetime.now() + timedelta(minutes=i*2) for i in range(n)],
    'lat': np.random.normal(base_lat, 0.04, n),
    'lng': np.random.normal(base_lng, 0.05, n),
    'company_id': 1
})

df.to_csv('sample_orders.csv', index=False)
print("✅ Sample data generated!")