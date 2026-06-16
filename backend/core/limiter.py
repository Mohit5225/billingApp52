from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.rate_limits import LIMIT_GLOBAL
from core.supabase import supabase

def get_user_or_ip(request: Request) -> str:
    """
    Extracts the 'sub' (user ID) from the JWT for rate limiting.
    Falls back to the client IP address if no valid JWT is present.
    This allows us to rate limit bad actors even if they change IPs.
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        parts = token.split(".")
        if len(parts) == 3:
            try:
                # get_claims securely verifies the JWT signature before returning the payload
                claims = supabase.auth.get_claims(token)
                sub = claims.get("sub")
                if sub:
                    return f"user:{sub}"
            except Exception:
                pass
                
    return get_remote_address(request)

# Global limiter instance with default limits for all routes
limiter = Limiter(key_func=get_user_or_ip, default_limits=[LIMIT_GLOBAL])
