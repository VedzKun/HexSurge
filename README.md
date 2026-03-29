# HexSurge-prod

Minimal scaffold for HexSurge prototype.

Backend: FastAPI exposing forecast endpoints sourced from `forecasts.csv`.

To run locally (recommended in a virtualenv):

```bash
pip install -r requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

Endpoints:
- `GET /health` — service health
- `GET /api/forecast/cells` — list aggregated cells with polygons
- `GET /api/forecast/cell/{cell_id}` — get single cell details
