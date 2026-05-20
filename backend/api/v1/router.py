from fastapi import APIRouter
from .endpoints import health, firms
from .endpoints import ledgers

api_router = APIRouter()

# Group all /api routes logically
api_router.include_router(health.router, prefix="/api/health", tags=["health"])
api_router.include_router(firms.router, prefix="/api/firms", tags=["firms"])
api_router.include_router(ledgers.router, prefix="/api/ledgers", tags=["ledgers"])
