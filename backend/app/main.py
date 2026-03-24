from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services import forecast

app = FastAPI(title="PulseDrop Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast.router, prefix="/api/forecast", tags=["forecast"])

@app.get("/health")
async def health():
    return {"status": "ok"}
