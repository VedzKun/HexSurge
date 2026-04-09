from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import ingest, live, predict

app = FastAPI(
    title="HexSurge",
    description="H3-powered Last-Mile Delivery Optimizer",
    version="1.1.0"
)

# Allow all origins so the driver mobile view (any IP/port) can POST
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(live.router)
app.include_router(predict.router)

@app.get("/")
async def root():
    return {
        "message": "🚀 HexSurge API is running",
        "docs": "/docs",
        "driver_view": "Open /driver on the frontend",
    }