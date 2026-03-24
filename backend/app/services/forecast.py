from fastapi import APIRouter, HTTPException
import pandas as pd
from core.h3_utils import cell_to_polygon_coords, get_neighbors

router = APIRouter()

@router.get("/cells")
async def list_cells(limit: int = 100):
    """Return aggregated mean yhat per H3 cell with polygon coords."""
    try:
        df = pd.read_csv("forecasts.csv")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="forecasts.csv not found")
    if df.empty:
        return {"cells": []}
    df['ds'] = pd.to_datetime(df['ds'])
    agg = df.groupby('h3_cell')['yhat'].mean().reset_index()
    results = []
    for _, row in agg.head(limit).iterrows():
        cell = str(row['h3_cell'])
        coords = cell_to_polygon_coords(cell)
        results.append({
            'h3_cell': cell,
            'yhat': float(row['yhat']) if not pd.isna(row['yhat']) else None,
            'polygon': coords,
        })
    return {"cells": results}

@router.get("/cell/{cell_id}")
async def get_cell(cell_id: str):
    try:
        df = pd.read_csv("forecasts.csv")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="forecasts.csv not found")
    cell_df = df[df['h3_cell'] == cell_id]
    if cell_df.empty:
        raise HTTPException(status_code=404, detail="cell not found")
    mean_y = float(cell_df['yhat'].mean(skipna=True))
    coords = cell_to_polygon_coords(cell_id)
    neighbors = list(get_neighbors(cell_id, k=1))
    return {"h3_cell": cell_id, "yhat": mean_y, "polygon": coords, "neighbors": neighbors}
