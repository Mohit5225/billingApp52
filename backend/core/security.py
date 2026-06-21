from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.supabase import get_supabase

security = HTTPBearer()

async def get_verified_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Dependency to extract and verify the JWT from the Authorization header.
    Returns the valid JWT string, or raises 401 Unauthorized.
    """
    jwt = credentials.credentials
    supabase = await get_supabase()

    # Verify token using get_claims() — fast with asymmetric keys (cached JWKS).
    # Does NOT catch server-side revocation, which is acceptable for this use case.
    try:
        await supabase.auth.get_claims(jwt)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    # yield is outside try/except so route exceptions (404, 422, etc.)
    # are never swallowed and returned as false 401s
    return jwt
