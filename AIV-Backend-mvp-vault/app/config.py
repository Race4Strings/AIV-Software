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
