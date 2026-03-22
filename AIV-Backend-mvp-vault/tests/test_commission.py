"""Tests for commission calculation logic — 30/25/20 engine."""
from decimal import Decimal
import pytest


def test_commission_rate_first_deal():
    """First deal per twin gets 30% commission."""
    from app.services.licensing_service import COMMISSION_RATES, DEFAULT_COMMISSION_RATE
    assert COMMISSION_RATES[1] == Decimal("0.30")


def test_commission_rate_second_deal():
    """Second deal per twin gets 25% commission."""
    from app.services.licensing_service import COMMISSION_RATES
    assert COMMISSION_RATES[2] == Decimal("0.25")


def test_commission_rate_third_and_beyond():
    """Third deal and beyond gets 20% commission."""
    from app.services.licensing_service import COMMISSION_RATES, DEFAULT_COMMISSION_RATE
    assert 3 not in COMMISSION_RATES
    assert DEFAULT_COMMISSION_RATE == Decimal("0.20")


def test_commission_calculation():
    """Commission = value * rate."""
    value = Decimal("45000")
    rate = Decimal("0.25")
    commission = value * rate
    assert commission == Decimal("11250.00")


def test_valid_data_scope():
    """Only 4 delivery modules are valid."""
    from app.services.licensing_service import VALID_DATA_SCOPE
    assert VALID_DATA_SCOPE == {"identity_profile", "knowledge_base", "voice_identity", "visual_identity"}


def test_valid_status_transitions():
    """Verify deal status transition rules."""
    from app.services.licensing_service import VALID_TRANSITIONS

    # SUBMITTED can only go to UNDER_REVIEW
    assert VALID_TRANSITIONS["SUBMITTED"] == ["UNDER_REVIEW"]

    # EXECUTED can only go to ACTIVE
    assert VALID_TRANSITIONS["EXECUTED"] == ["ACTIVE"]

    # COMPLETED is terminal
    assert VALID_TRANSITIONS["COMPLETED"] == []
    assert VALID_TRANSITIONS["TERMINATED"] == []


def test_net_payout_calculation():
    """Net = gross - commission."""
    gross = Decimal("50000")
    commission = gross * Decimal("0.30")  # 30% first deal
    net = gross - commission
    assert net == Decimal("35000")
    assert commission == Decimal("15000")
