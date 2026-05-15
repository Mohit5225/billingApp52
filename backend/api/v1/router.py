from fastapi import APIRouter
from .endpoints import health, dev

api_router = APIRouter()

# Group all /api routes logically
api_router.include_router(health.router, prefix="/api", tags=["health"])

# Dev router handles its own specific un-prefixed paths like /items/{item_id}
api_router.include_router(dev.router, tags=["dev"])
