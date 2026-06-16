from fastapi import APIRouter, Depends
from core.security import get_verified_jwt
from core.supabase import supabase
from core.limiter import limiter

router = APIRouter()

@router.get("/status")
@limiter.exempt
async def get_status(jwt: str = Depends(get_verified_jwt)):
    return {
        "status": "connected",
        "timestamp": "2026-05-13T10:46:12Z",
        "server": "FastAPI",
        "auth": "verified"
    }

@router.get("/db-check")
@limiter.exempt
async def check_db(jwt: str = Depends(get_verified_jwt)):
    try:
        # Perform a lightweight query to verify the connection and RLS.
        # We use .auth(jwt) to ensure the query is scoped to the user's identity.
        response = (
            supabase
            .table("invoices")
            .select("id", count="exact")
            .limit(1)
            .auth(jwt)
            .execute()
        )
        return {
            "status": "connected", 
            "message": "Supabase connection successful",
            "data_count": response.count
        }
    except Exception as e:
        return {
            "status": "error", 
            "message": "Failed to query database. Ensure tables and RLS policies are created.",
            "error_details": str(e)
        }
