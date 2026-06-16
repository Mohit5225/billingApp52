from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# The core config loads .env automatically on import
import core.config

# Import the master router
from api.v1.router import api_router
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError
import re
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from core.limiter import limiter

app = FastAPI(title="Billing App API")
app.state.limiter = limiter

# SlowAPIMiddleware MUST be added for default_limits to fire on undecorated routes.
# Without this, only explicitly-decorated @limiter.limit(...) endpoints are protected.
app.add_middleware(SlowAPIMiddleware)

# Custom 429 handler — returns a generic message to avoid leaking limit details to attackers.
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."},
        headers={"Retry-After": str(getattr(exc, "retry_after", 60))},
    )

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
@limiter.exempt
async def root():
    return {"message": "Hello from FastAPI Backend"}


@app.get("/healthz")
@limiter.exempt
async def healthz():
    return {"status": "ok"}

@app.exception_handler(APIError)
async def postgrest_api_error_handler(request, exc: APIError):
    error_dict = exc.json() if hasattr(exc, "json") else (exc.__dict__ or {})
    message = error_dict.get("message", "Database error occurred")
    code = error_dict.get("code")
    details = error_dict.get("details")
    
    status_code = 400
    detail_message = message
    
    if code == "23505":  # Unique violation
        status_code = 409
        if details:
            # Parse: Key (col1, col2)=(val1, val2) already exists.
            match = re.search(r"Key \((.*?)\)=\((.*?)\) already exists", details)
            if match:
                keys = [k.strip() for k in match.group(1).split(",")]
                vals = [v.strip() for v in match.group(2).split(",")]
                val_map = dict(zip(keys, vals))
                
                if "voucher_number" in val_map:
                    v_num = val_map["voucher_number"]
                    v_cat = val_map.get("category", "Sales")
                    detail_message = f"Voucher number '{v_num}' already exists for category '{v_cat}'."
                elif "name" in val_map:
                    detail_message = f"A record with the name '{val_map['name']}' already exists."
                else:
                    friendly_items = [f"{k.replace('_', ' ').title()} '{v}'" for k, v in val_map.items() if k != "firm_id"]
                    if friendly_items:
                        detail_message = f"Duplicate entry: {', '.join(friendly_items)} already exists."
        else:
            detail_message = "A record with this unique value already exists."
    elif code == "23503":  # Foreign key violation
        status_code = 400
        detail_message = f"Foreign key violation: Referenced record does not exist. {details or ''}"
    
    return JSONResponse(status_code=status_code, content={"detail": detail_message})

# Include all modular API routes
app.include_router(api_router)
