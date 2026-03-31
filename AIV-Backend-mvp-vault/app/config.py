from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str
    database_url_sync: str = ""
    
    @property
    def async_database_url(self) -> str:
        """Ensure the URL uses the asyncpg driver."""
        url = self.database_url
        if not url:
            return url
        # Handle Railway's potentially different protocol
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # Session
    session_secret: str = "change-me-in-production"
    session_expire_minutes: int = 1440  # 24 hours
    
    # CORS
    cors_origins: str = "http://localhost:3000"
    
    # Cookies
    cookie_samesite: str = "lax"  # Default to 'lax' for local, but override to 'none' in prod
    cookie_secure: bool = False   # Default to False for local, but override to True in prod

    @field_validator("cookie_samesite", mode="before")
    @classmethod
    def validate_cookie_samesite(cls, v: str) -> str:
        """Ensure SameSite is lowercase and stripped of whitespace."""
        # Handle potential None type if loaded from empty env
        if v is None:
            return "lax"
        val = str(v).strip().lower()
        if val not in ["lax", "strict", "none"]:
            return "lax" # Fallback to safe default
        return val

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip().strip('"').strip("'") for origin in self.cors_origins.split(",") if origin.strip()]
    
    # Email
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    from_email: str = Field("noreply@aiv.chat", alias="SMTP_FROM")
    resend_api_key: str = Field("", alias="RESEND_API_KEY")
    
    # MinIO / S3
    # We use aliases to support generic S3 variables provided by Railway or AWS
    minio_endpoint: str = Field("localhost:9000", alias="MINIO_ENDPOINT")
    minio_access_key: str = Field("minioadmin", alias="MINIO_ACCESS_KEY")
    minio_secret_key: str = Field("minioadmin", alias="MINIO_SECRET_KEY")
    minio_bucket: str = Field("aiv-uploads", alias="MINIO_BUCKET")
    minio_secure: bool = Field(False, alias="MINIO_SECURE")
    minio_region: str = Field("us-east-1", alias="MINIO_REGION")
    # Public URL for frontend access (set this to external bucket URL in production)
    minio_public_url: str = Field("", alias="MINIO_PUBLIC_URL")
    
    # AI
    google_genai_api_key: str = ""

    # Google Custom Search Engine (for discovery)
    google_cse_api_key: str = ""
    google_cse_id: str = ""
    
    # Polygon Blockchain
    polygon_rpc_url: str = ""
    polygon_private_key: str = ""
    cert_contract_address: str = ""
    
    # ElevenLabs (Voice Cloning)
    elevenlabs_api_key: str = ""
    
    # Google OAuth (for Gmail, Calendar integrations)
    google_client_id: str = ""
    google_client_secret: str = ""
    
    # ALCM API
    alcm_api_url: str = "http://localhost:8001"
    alcm_api_timeout: int = 30
    alcm_auth_token: str = "dev-alcm-token-change-in-production"

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_platform_fee_price_id: str = ""  # Stripe Price ID for $997/month subscription

    # Business Logic — Commission & Fees
    commission_rate_first_deal: float = 0.30   # 30% on first deal per twin
    commission_rate_second_deal: float = 0.25  # 25% on second deal
    commission_rate_default: float = 0.20      # 20% on third+ deals
    platform_fee_monthly: float = 997.00       # $997/month platform partnership fee

    # Zoho Sign (e-signatures) — replaces Dropbox Sign
    zoho_sign_client_id: str = ""
    zoho_sign_client_secret: str = ""
    zoho_sign_redirect_uri: str = "http://localhost:8000/auth/zoho/callback"
    zoho_sign_org_id: str = ""  # Retrieved programmatically if not set
    zoho_sign_access_token: str = ""  # Set after OAuth flow
    zoho_sign_refresh_token: str = ""  # Set after OAuth flow

    # Dropbox Sign (HelloSign) — legacy, kept for reference
    dropbox_sign_api_key: str = ""

    # Anthropic (for assistant orchestration — generation is ALCM's job)
    anthropic_api_key: str = ""

    # URLs
    api_base_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3001"

    # Dev mode — exposes OTP in API responses for testing without email
    dev_mode: bool = False
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


def validate_production_config() -> list[str]:
    """Check for unsafe defaults that must be changed before production.

    Returns list of warnings. Empty list = safe for production.
    Called on startup when dev_mode is False.
    """
    settings = get_settings()
    warnings = []

    if settings.dev_mode:
        return []  # Dev mode — skip validation

    if settings.session_secret == "change-me-in-production":
        warnings.append("CRITICAL: session_secret is using the default value. Set a cryptographically random string.")

    if settings.alcm_auth_token == "dev-alcm-token-change-in-production":
        warnings.append("WARNING: alcm_auth_token is using the dev default. Set a production token.")

    if not settings.cookie_secure:
        warnings.append("WARNING: cookie_secure is False. Must be True for HTTPS in production.")

    if settings.cors_origins == "http://localhost:3000":
        warnings.append("WARNING: cors_origins is set to localhost. Update to production frontend URL.")

    if not settings.stripe_secret_key:
        warnings.append("WARNING: stripe_secret_key is empty. Payments will be disabled.")

    if not settings.resend_api_key and settings.smtp_host == "localhost":
        warnings.append("WARNING: No email provider configured. OTP emails will fail.")

    return warnings
