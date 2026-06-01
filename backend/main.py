from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# The core config loads .env automatically on import
import core.config

# Import the master router
from api.v1.router import api_router

app = FastAPI(title="Billing App API")

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello from FastAPI Backend"}


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

# Include all modular API routes
app.include_router(api_router)
