from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """ALCM API settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql+asyncpg://aiv:aiv_password@localhost:5432/alcm_db"

    # LLM Provider (gemini for dev, claude for production)
    llm_provider: str = "gemini"  # "gemini" | "claude"

    # Gemini (development default)
    google_genai_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # Anthropic/Claude (production)
    anthropic_api_key: str = ""
    anthropic_model_primary: str = "claude-sonnet-4-20250514"
    anthropic_model_classification: str = "claude-haiku-4-5-20251001"

    # LLM timeouts (seconds)
    llm_request_timeout: int = 60
    llm_stream_timeout: int = 120

    # Scraping config
    max_research_snippet_length: int = 2500

    # ElevenLabs (behind abstraction)
    elevenlabs_api_key: str = ""

    # Auth (bearer token for platform-to-ALCM calls)
    alcm_auth_token: str = "dev-alcm-token-change-in-production"

    # Storage
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "alcm-media"
    minio_secure: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
