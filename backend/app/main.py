from fastapi import FastAPI
from .routers import ingest, predict

app = FastAPI(
    title="PulseDrop",
    description="H3-powered Last-Mile Delivery Optimizer",
    version="1.0.0"
)

app.include_router(ingest.router)
app.include_router(predict.router)

@app.get("/")
async def root():
    return {
        "message": "🚀 PulseDrop API is running",
        "docs": "/docs",
        "predict_example": "/predict/13.0827/80.2707"
    }