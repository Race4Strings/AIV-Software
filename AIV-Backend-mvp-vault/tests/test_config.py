"""Tests for production config validation."""
import pytest
from unittest.mock import patch, MagicMock
from app.config import validate_production_config


class TestProductionConfigValidation:
    """Verify startup config validation catches unsafe defaults."""

    @patch("app.config.get_settings")
    def test_warns_on_default_session_secret(self, mock_get):
        settings = MagicMock()
        settings.dev_mode = False
        settings.session_secret = "change-me-in-production"
        settings.alcm_auth_token = "real-token"
        settings.cookie_secure = True
        settings.cors_origins = "https://aiv.chat"
        settings.stripe_secret_key = "sk_live_xxx"
        settings.resend_api_key = "re_xxx"
        settings.smtp_host = "smtp.resend.com"
        mock_get.return_value = settings
        warnings = validate_production_config()
        assert any("session_secret" in w for w in warnings)

    @patch("app.config.get_settings")
    def test_warns_on_dev_alcm_token(self, mock_get):
        settings = MagicMock()
        settings.dev_mode = False
        settings.session_secret = "real-secret-123"
        settings.alcm_auth_token = "dev-alcm-token-change-in-production"
        settings.cookie_secure = True
        settings.cors_origins = "https://aiv.chat"
        settings.stripe_secret_key = "sk_live_xxx"
        settings.resend_api_key = "re_xxx"
        settings.smtp_host = "smtp.resend.com"
        mock_get.return_value = settings
        warnings = validate_production_config()
        assert any("alcm_auth_token" in w for w in warnings)

    @patch("app.config.get_settings")
    def test_warns_on_insecure_cookies(self, mock_get):
        settings = MagicMock()
        settings.dev_mode = False
        settings.session_secret = "real-secret-123"
        settings.alcm_auth_token = "real-token"
        settings.cookie_secure = False
        settings.cors_origins = "https://aiv.chat"
        settings.stripe_secret_key = "sk_live_xxx"
        settings.resend_api_key = "re_xxx"
        settings.smtp_host = "smtp.resend.com"
        mock_get.return_value = settings
        warnings = validate_production_config()
        assert any("cookie_secure" in w for w in warnings)

    @patch("app.config.get_settings")
    def test_skips_validation_in_dev_mode(self, mock_get):
        settings = MagicMock()
        settings.dev_mode = True
        mock_get.return_value = settings
        warnings = validate_production_config()
        assert warnings == []

    @patch("app.config.get_settings")
    def test_no_warnings_when_all_correct(self, mock_get):
        settings = MagicMock()
        settings.dev_mode = False
        settings.session_secret = "real-production-secret-32chars"
        settings.alcm_auth_token = "real-production-token"
        settings.cookie_secure = True
        settings.cors_origins = "https://aiv.chat"
        settings.stripe_secret_key = "sk_live_xxx"
        settings.resend_api_key = "re_xxx"
        settings.smtp_host = "smtp.resend.com"
        mock_get.return_value = settings
        warnings = validate_production_config()
        assert len(warnings) == 0
