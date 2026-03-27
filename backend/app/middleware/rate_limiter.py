from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],
    storage_uri=None,  # Set in main.py from config
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": True,
            "status_code": 429,
            "detail": "Rate limit exceeded. Please try again later.",
        },
    )
