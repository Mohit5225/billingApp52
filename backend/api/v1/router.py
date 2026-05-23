from fastapi import APIRouter
from .endpoints import health, firms, ledgers, uom, hsn, items, vouchers

api_router = APIRouter()

# Group all /api routes logically
api_router.include_router(health.router,    prefix="/api/health",    tags=["health"])
api_router.include_router(firms.router,     prefix="/api/firms",     tags=["firms"])
api_router.include_router(ledgers.router,   prefix="/api/ledgers",   tags=["ledgers"])
api_router.include_router(uom.router,       prefix="/api/uom",       tags=["uom"])
api_router.include_router(hsn.router,       prefix="/api/hsn",       tags=["hsn"])
api_router.include_router(items.router,     prefix="/api/items",     tags=["items"])
api_router.include_router(vouchers.router,  prefix="/api/vouchers",  tags=["vouchers"])
