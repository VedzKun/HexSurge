# h3_pipeline.py
import h3
import pandas as pd
import warnings
from prophet import Prophet

# Prophet currently emits a pandas deprecation warning for uppercase 'H' internally.
warnings.filterwarnings(
    "ignore",
    message=r".*'H' is deprecated and will be removed in a future version, please use 'h' instead.*",
    category=FutureWarning,
    module=r"prophet\.forecaster",
)

df = pd.read_csv('chennai_orders.csv')

# Step 3.1: Convert every lat/lng to H3 cell (res 9 = ~340m — perfect for last-mile)
df['h3_cell'] = df.apply(lambda row: h3.latlng_to_cell(row['lat'], row['lng'], 9), axis=1)

# Step 3.2: Aggregate hourly demand per hexagon
df['ds'] = pd.to_datetime(df['timestamp']).dt.floor('h')
demand_df = df.groupby(['h3_cell', 'ds']).size().reset_index(name='demand')

# Step 3.3: Train simple Prophet model per hexagon (handles peaks automatically)
def train_hex_model(group):
    m = Prophet(daily_seasonality=True, weekly_seasonality=True)
    # Prophet expects columns named 'ds' (datetime) and 'y' (value)
    train_df = group[['ds', 'demand']].rename(columns={'demand': 'y'})
    train_df = train_df.sort_values('ds')
    # Require at least two observations to fit Prophet
    if train_df['y'].dropna().shape[0] < 2:
        start = train_df['ds'].max()
        future_ds = pd.date_range(start=start + pd.Timedelta(hours=1), periods=24, freq='h')
        return pd.DataFrame({'ds': future_ds, 'yhat': [float('nan')] * 24})
    m.fit(train_df)
    future = m.make_future_dataframe(periods=24, freq='h')
    forecast = m.predict(future)
    return forecast[['ds', 'yhat']].iloc[-24:]  # next 24 hours

print("Training models on H3 cells...")
forecasts = demand_df.groupby('h3_cell').apply(train_hex_model).reset_index()

# Step 3.4: Add neighbor smoothing (H3 magic!)
def get_hot_neighbors(cell):
    return h3.grid_disk(cell, k=1)  # self + 6 neighbors
# Convert types and fill NaNs by averaging neighbors at the same timestamp
forecasts['h3_cell'] = forecasts['h3_cell'].astype(str)
forecasts['ds'] = pd.to_datetime(forecasts['ds'])

# Cache neighbors for cells we see
neighbor_cache = {}

nan_idx = forecasts['yhat'].isna()
for idx, row in forecasts[nan_idx].iterrows():
    cell = str(row['h3_cell'])
    ds = row['ds']
    if cell not in neighbor_cache:
        try:
            neigh = get_hot_neighbors(cell)
        except Exception:
            neigh = set()
        # exclude self to prefer neighbors
        neighbor_cache[cell] = set(neigh) - {cell}
    neigh_cells = list(neighbor_cache[cell])
    if neigh_cells:
        vals = forecasts[(forecasts['h3_cell'].isin(neigh_cells)) & (forecasts['ds'] == ds)]['yhat'].dropna()
        if not vals.empty:
            fill_val = vals.mean()
        else:
            # fallback to mean across all cells at this timestamp
            vals2 = forecasts[forecasts['ds'] == ds]['yhat'].dropna()
            fill_val = vals2.mean() if not vals2.empty else 0.0
    else:
        vals2 = forecasts[forecasts['ds'] == ds]['yhat'].dropna()
        fill_val = vals2.mean() if not vals2.empty else 0.0
    forecasts.at[idx, 'yhat'] = float(fill_val)

# Save for dashboard
forecasts.to_csv('forecasts.csv', index=False)
print("✅ H3 forecasting complete!")