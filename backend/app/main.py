from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import ingest, predict, live

app = FastAPI(
    title="HexSurge API",
    description="Real-time H3 last-mile optimizer for Chennai",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(predict.router)
app.include_router(live.router)


@app.get("/")
async def root():
    return {
        "message": "HexSurge API is running",
        "docs": "/docs",
        "ingest_example": "/gps/ingest",
        "predict_example": "/predict/13.0827/80.2707",
    }
