"""Tests for blockchain service — config checks, network label, typed records."""
import pytest
from unittest.mock import patch, MagicMock
from app.services.blockchain_service import BlockchainService, RECORD_TYPES


class TestBlockchainConfig:
    """Verify blockchain service initialization from config."""

    @patch("app.services.blockchain_service.settings")
    def test_disabled_when_rpc_url_missing(self, mock_settings):
        mock_settings.polygon_rpc_url = ""
        mock_settings.polygon_private_key = "0xabc"
        mock_settings.cert_contract_address = "0xdef"
        svc = BlockchainService()
        assert svc.enabled is False

    @patch("app.services.blockchain_service.settings")
    def test_disabled_when_private_key_missing(self, mock_settings):
        mock_settings.polygon_rpc_url = "https://rpc.polygon.com"
        mock_settings.polygon_private_key = ""
        mock_settings.cert_contract_address = "0xdef"
        svc = BlockchainService()
        assert svc.enabled is False

    @patch("app.services.blockchain_service.settings")
    def test_disabled_when_contract_address_missing(self, mock_settings):
        mock_settings.polygon_rpc_url = "https://rpc.polygon.com"
        mock_settings.polygon_private_key = "0xabc"
        mock_settings.cert_contract_address = ""
        svc = BlockchainService()
        assert svc.enabled is False

    @patch("app.services.blockchain_service.settings")
    def test_disabled_returns_none_on_anchor(self, mock_settings):
        mock_settings.polygon_rpc_url = ""
        mock_settings.polygon_private_key = ""
        mock_settings.cert_contract_address = ""
        svc = BlockchainService()
        import asyncio
        result = asyncio.get_event_loop().run_until_complete(
            svc.anchor_hash("abc123", "twin-1")
        )
        assert result is None


class TestRecordTypes:
    """Verify typed record constants."""

    def test_identity_seal_exists(self):
        assert "IDENTITY_SEAL" in RECORD_TYPES

    def test_identity_update_exists(self):
        assert "IDENTITY_UPDATE" in RECORD_TYPES

    def test_deal_execution_exists(self):
        assert "DEAL_EXECUTION" in RECORD_TYPES

    def test_audit_anchor_exists(self):
        assert "AUDIT_ANCHOR" in RECORD_TYPES

    def test_exactly_four_record_types(self):
        assert len(RECORD_TYPES) == 4
