from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# The core config loads .env automatically on import
import core.config

# Import the master router
from api.v1.router import api_router

app = FastAPI(title="Billing App API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello from FastAPI Backend"}

# Include all modular API routes
app.include_router(api_router)
