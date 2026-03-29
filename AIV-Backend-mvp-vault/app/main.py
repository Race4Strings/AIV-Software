from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import init_db
from fastapi.staticfiles import StaticFiles
from .routers import (
    auth_router, upload_router,
    twin_router, audit_router,
    onboarding_router, verify_router,
    agent_router, licensing_router,
    payments_router, notifications_router,
    guardrails_router, consent_router,
    organizations_router, packages_router,
    calibration_router,
)

from .middleware import SessionMiddleware

import logging
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting AIV Backend...")
    try:
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}", exc_info=True)

    settings = get_settings()
    logger.info(f"CORS origins: {settings.cors_origins_list}")
    logger.info(f"Cookie: SameSite={settings.cookie_samesite}, Secure={settings.cookie_secure}")

    import redis.asyncio as redis
    try:
        r = redis.from_url(settings.redis_url, decode_responses=True)
        await r.ping()
        # Mask credentials in Redis URL
        masked = settings.redis_url.split("@")[-1] if "@" in settings.redis_url else settings.redis_url
        logger.info(f"Redis connected: {masked}")
        await r.close()
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")

    # Start scheduled jobs (deal expiry + platform fee activation)
    from .services.scheduler import start_scheduler
    scheduler = start_scheduler()

    yield

    # Shutdown
    scheduler.shutdown(wait=False)
    logger.info("Shutting down AIV Backend...")



def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded

    limiter = Limiter(key_func=get_remote_address)

    app = FastAPI(
        title="AIV Backend API",
        description="Backend API for the AIV Platform - Authentication, Cloning Portal, and more",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    
    # Mount static files
    import os
    if not os.path.exists("static"):
        os.makedirs("static")
    app.mount("/static", StaticFiles(directory="static"), name="static")
    
    # Session middleware (added first so it runs AFTER CORS)
    app.add_middleware(SessionMiddleware)
    
    # CORS middleware (added last so it runs FIRST — handles OPTIONS preflight before anything else)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(auth_router)
    app.include_router(upload_router)
    app.include_router(twin_router)
    app.include_router(onboarding_router)
    app.include_router(agent_router)
    app.include_router(licensing_router)
    app.include_router(payments_router)
    app.include_router(notifications_router)
    app.include_router(guardrails_router)
    app.include_router(consent_router)
    app.include_router(organizations_router)
    app.include_router(packages_router)
    app.include_router(verify_router)
    app.include_router(audit_router)
    app.include_router(calibration_router)

    @app.get("/")
    async def root():
        return {
            "name": "AIV Backend API",
            "version": "1.0.0",
            "status": "running",
        }
    
    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    @app.get("/health/alcm")
    async def health_alcm():
        """Check ALCM API connectivity."""
        from .services.alcm_client import get_alcm_client
        client = get_alcm_client()
        result = await client.health_check()
        return {
            "alcm_available": client.is_available,
            "alcm_status": result.get("status", "unknown"),
        }

    @app.get("/health/blockchain")
    async def health_blockchain():
        """Check blockchain service status and wallet balance."""
        from .services.blockchain_service import BlockchainService
        bc = BlockchainService()
        return await bc.check_wallet_balance()

    # ------------------------------------------------------------------
    # Zoho Sign OAuth
    # ------------------------------------------------------------------

    @app.get("/auth/zoho/authorize")
    async def zoho_authorize():
        """Start the Zoho Sign OAuth flow. Returns the authorization URL."""
        from .services.esign_service import ESignService
        svc = ESignService()
        return {"authorization_url": svc.get_oauth_url()}

    @app.get("/auth/zoho/callback")
    async def zoho_callback(code: str = "", state: str = ""):
        """OAuth callback — exchanges the authorization code for tokens."""
        if not code:
            return {"error": "No authorization code received"}
        from .services.esign_service import ESignService
        svc = ESignService()
        result = await svc.exchange_code_for_tokens(code)
        if result:
            return {
                "status": "success",
                "message": "Zoho Sign connected. Save the refresh_token to your .env file.",
                "refresh_token": result.get("refresh_token"),
                "access_token_expires_in": result.get("expires_in"),
            }
        return {"error": "Failed to exchange code for tokens"}

    return app


# Create the app instance
app = create_app()
