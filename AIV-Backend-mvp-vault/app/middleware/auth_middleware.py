import json
from typing import Optional
from uuid import UUID
from fastapi import Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis

from ..config import get_settings
from ..database import get_db
from ..services.auth_service import AuthService


class SessionMiddleware(BaseHTTPMiddleware):
    """Middleware for Redis session management."""
    
    async def dispatch(self, request: Request, call_next):
        # Get or create session ID from cookie
        session_id = request.cookies.get("session_id")
        
        if session_id:
            # Load session from Redis
            settings = get_settings()
            r = redis.from_url(settings.redis_url, decode_responses=True)
            try:
                session_data = await r.get(f"session:{session_id}")
                if session_data:
                    request.state.session = json.loads(session_data)
                    print(f"🔓 Session loaded for user: {request.state.session.get('id', 'unknown')}")
                else:
                    request.state.session = {}
                    print(f"⚠️ Session ID cookie present but no data in Redis: {session_id[:8]}...")
            except Exception as e:
                request.state.session = {}
                print(f"❌ Session load error: {e}")
            finally:
                await r.close()
        else:
            request.state.session = {}
            # Only log for protected routes (not static or health checks)
            if request.url.path.startswith("/clone") or request.url.path.startswith("/auth/me"):
                print(f"🚫 No session cookie received for: {request.url.path}")
        
        response = await call_next(request)
        return response


async def get_redis_client():
    """Get Redis client."""
    settings = get_settings()
    r = redis.from_url(settings.redis_url, decode_responses=True)
    try:
        yield r
    finally:
        await r.close()


async def get_current_user(
    request: Request,
) -> Optional[dict]:
    """
    Dependency to get current user from session.
    Returns None if not authenticated.
    """
    session = getattr(request.state, "session", {})
    return session.get("user")


async def require_auth(
    request: Request,
) -> dict:
    """
    Dependency that requires authentication.
    Raises 401 if not authenticated.
    """
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def create_session(
    redis_client: redis.Redis,
    session_id: str,
    user_data: dict,
    expire_minutes: int = 1440,
) -> None:
    """Create a new session in Redis."""
    await redis_client.setex(
        f"session:{session_id}",
        expire_minutes * 60,
        json.dumps({"user": user_data}),
    )


async def destroy_session(
    redis_client: redis.Redis,
    session_id: str,
) -> None:
    """Destroy a session in Redis."""
    await redis_client.delete(f"session:{session_id}")
