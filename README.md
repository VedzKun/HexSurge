# HexSurge

HexSurge is a visual control room for delivery fleets in Chennai. You open one page and instantly see where demand is heating up by H3 hexagonal zones.

## What you can do

- See a live Chennai map with H3 cells at resolution 9
- Spot zones as:
  - Green = normal
  - Orange = busy
  - Red = hot
- Hover zones to read real area names like Tambaram, Velachery, OMR, Guindy, and more
- Track 4 live business metrics with animated count-up cards
- Add real GPS points manually (lat/lng/company)
- Trigger simulation with 10, 15, or 20 realistic Chennai points
- Watch zones + stats refresh every 4 seconds

## Tech stack

- Backend: FastAPI + Redis + H3
- Frontend: React 18 + Vite + Deck.gl H3 layer + Framer Motion
- Containers: Docker + docker-compose

## Run (one command)

```bash
docker-compose up --build
```

Then open:

- App: http://localhost:5173
- API docs: http://localhost:8000/docs

## API endpoints

- `POST /gps/ingest` -> add one live point
- `POST /gps/simulate-dinner-rush` -> add 20 realistic points
- `GET /predict/{lat}/{lng}` -> get surge info for a location
- `GET /live/zones` -> active zones for the map (supports multi-res + time travel + forecast)
- `GET /live/stats` -> live dashboard stats (same query options as zones)
- `GET /live/rider-suggestions` -> simple greedy rider move suggestions

### Live query options

These endpoints support:

- `res`: `8 | 9 | 10` (neighborhood / street / block)
- `mode`: `now | next_hour` (toggle predicted next 60 minutes)
- `at`: epoch seconds (time travel replay)
- `window_minutes`: aggregation window for replay (default 15)

Example:

- `GET /live/zones?res=8&mode=next_hour`
- `GET /live/zones?res=9&at=1700000000&window_minutes=15`

## Project structure

```text
HexSurge/
  backend/
    Dockerfile
    app/
      main.py
      dependencies.py
      routers/
        __init__.py
        ingest.py
        predict.py
        live.py
      services/
        zones.py
      schemas.py
  frontend/
    Dockerfile
    package.json
    vite.config.js
    index.html
    src/
      main.jsx
      App.jsx
      Map.jsx
      LiveStats.jsx
      ZoneList.jsx
      Controls.jsx
      api.js
      index.css
  docker-compose.yml
  requirements.txt
  README.md
```

## Notes for demo use

- Data is intentionally simple and visual for non-technical fleet owners.
- Redis stores short-lived zone demand so the dashboard always feels live.
- H3 keeps area logic clean and stable across updates.
