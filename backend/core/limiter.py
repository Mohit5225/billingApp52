import base64
import json

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.rate_limits import LIMIT_GLOBAL


def _extract_jwt_sub(token: str) -> str | None:
    """
    Extract the 'sub' claim from a JWT without signature verification.
    This is safe to use for rate-limiting purposes only — the actual
    signature validation happens in get_verified_jwt / get_profile_context.
    """
    parts = token.split(".")
    if len(parts) != 3:
        return None
    try:
        # Add padding if needed
        payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        return payload.get("sub")
    except Exception:
        return None


def get_user_or_ip(request: Request) -> str:
    """
    Extracts the 'sub' (user ID) from the JWT for rate limiting.
    Falls back to the client IP address if no valid JWT is present.
    This allows us to rate limit bad actors even if they change IPs.
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        sub = _extract_jwt_sub(token)
        if sub:
            return f"user:{sub}"

    return get_remote_address(request)


# Global limiter instance with default limits for all routes
limiter = Limiter(key_func=get_user_or_ip, default_limits=[LIMIT_GLOBAL])
