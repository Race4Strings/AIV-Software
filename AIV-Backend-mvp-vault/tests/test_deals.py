"""Tests for deal lifecycle — state machine, Gate 2, data_scope validation."""
import pytest
from decimal import Decimal
from app.services.licensing_service import VALID_TRANSITIONS, VALID_DATA_SCOPE, COMMISSION_RATES, DEFAULT_COMMISSION_RATE


class TestDealStatusTransitions:
    """Verify VALID_TRANSITIONS state machine."""

    def test_submitted_can_go_to_under_review(self):
        assert "UNDER_REVIEW" in VALID_TRANSITIONS["SUBMITTED"]

    def test_under_review_can_go_to_approved_or_back(self):
        assert "APPROVED" in VALID_TRANSITIONS["UNDER_REVIEW"]
        assert "SUBMITTED" in VALID_TRANSITIONS["UNDER_REVIEW"]

    def test_approved_can_go_to_contract_sent(self):
        assert "CONTRACT_SENT" in VALID_TRANSITIONS["APPROVED"]

    def test_contract_sent_can_go_to_executed(self):
        assert "EXECUTED" in VALID_TRANSITIONS["CONTRACT_SENT"]

    def test_executed_can_go_to_active(self):
        assert "ACTIVE" in VALID_TRANSITIONS["EXECUTED"]

    def test_active_can_complete_or_terminate(self):
        assert "COMPLETED" in VALID_TRANSITIONS["ACTIVE"]
        assert "TERMINATED" in VALID_TRANSITIONS["ACTIVE"]

    def test_completed_is_terminal(self):
        assert VALID_TRANSITIONS["COMPLETED"] == []

    def test_expired_is_terminal(self):
        assert VALID_TRANSITIONS["EXPIRED"] == []

    def test_terminated_is_terminal(self):
        assert VALID_TRANSITIONS["TERMINATED"] == []

    def test_cannot_skip_from_submitted_to_executed(self):
        assert "EXECUTED" not in VALID_TRANSITIONS["SUBMITTED"]

    def test_cannot_go_backwards_from_completed(self):
        assert "ACTIVE" not in VALID_TRANSITIONS["COMPLETED"]


class TestDataScope:
    """Verify data_scope module validation."""

    def test_valid_modules(self):
        assert "identity_profile" in VALID_DATA_SCOPE
        assert "knowledge_base" in VALID_DATA_SCOPE
        assert "voice_identity" in VALID_DATA_SCOPE
        assert "visual_identity" in VALID_DATA_SCOPE

    def test_invalid_module_rejected(self):
        invalid = {"personality_raw"} - VALID_DATA_SCOPE
        assert len(invalid) == 1

    def test_exactly_four_valid_modules(self):
        assert len(VALID_DATA_SCOPE) == 4


class TestCommissionRates:
    """Verify commission rate configuration."""

    def test_first_deal_is_30_percent(self):
        assert COMMISSION_RATES[1] == Decimal("0.3")

    def test_second_deal_is_25_percent(self):
        assert COMMISSION_RATES[2] == Decimal("0.25")

    def test_third_deal_and_beyond_is_20_percent(self):
        assert DEFAULT_COMMISSION_RATE == Decimal("0.2")
