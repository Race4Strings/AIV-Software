"""Shared test fixtures for AIV backend tests."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from decimal import Decimal


@pytest.fixture
def mock_db():
    """Mock async database session."""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.add = MagicMock()
    return db


@pytest.fixture
def mock_settings():
    """Mock settings with test values."""
    settings = MagicMock()
    settings.commission_rate_first_deal = 0.30
    settings.commission_rate_second_deal = 0.25
    settings.commission_rate_default = 0.20
    settings.platform_fee_monthly = 997.00
    settings.polygon_rpc_url = ""
    settings.polygon_private_key = ""
    settings.cert_contract_address = ""
    settings.polygon_network = "polygon-amoy"
    settings.anthropic_api_key = ""
    settings.alcm_api_url = "http://localhost:8001"
    settings.alcm_auth_token = "test-token"
    settings.session_secret = "test-secret"
    settings.dev_mode = True
    settings.cookie_secure = False
    settings.cors_origins = "http://localhost:3000"
    settings.stripe_secret_key = ""
    settings.resend_api_key = ""
    settings.smtp_host = "localhost"
    return settings
