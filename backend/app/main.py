from fastapi import FastAPI
from .routers import predict, ingest   # add predict here

app = FastAPI(title="PulseDrop API", version="1.0")

app.include_router(ingest.router)     # your existing GPS ingest
app.include_router(predict.router)    # ← ADD THIS LINE

@app.get("/")
async def root():
    return {"message": "PulseDrop Last-Mile Optimizer API is running 🚀"}