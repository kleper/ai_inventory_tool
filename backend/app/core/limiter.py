
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
from starlette.requests import Request

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

def get_key_func(request: Request):
    """
    Strategy:
    - If user is authenticated (request.state.user), use user ID.
    - Otherwise, use IP address.
    """
    if hasattr(request.state, "user") and request.state.user:
        return str(request.state.user.id)
    return get_remote_address(request)

limiter = Limiter(key_func=get_key_func, storage_uri=REDIS_URL)
