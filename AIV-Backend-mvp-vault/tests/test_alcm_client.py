"""Tests for ALCM client error handling and graceful degradation."""
import pytest


def test_alcm_error_hierarchy():
    """All ALCM errors inherit from ALCMError."""
    from app.services.alcm_client import (
        ALCMError, ALCMConnectionError, ALCMTimeoutError,
        ALCMValidationError, ALCMNotFoundError, ALCMServerError,
    )
    assert issubclass(ALCMConnectionError, ALCMError)
    assert issubclass(ALCMTimeoutError, ALCMError)
    assert issubclass(ALCMValidationError, ALCMError)
    assert issubclass(ALCMNotFoundError, ALCMError)
    assert issubclass(ALCMServerError, ALCMError)


def test_validation_error_has_details():
    """ALCMValidationError carries status code and details."""
    from app.services.alcm_client import ALCMValidationError
    err = ALCMValidationError("bad request", status_code=400, details={"field": "twin_id"})
    assert err.status_code == 400
    assert err.details == {"field": "twin_id"}


def test_graceful_client_has_availability_flag():
    """GracefulALCMClient tracks whether ALCM is reachable."""
    from app.services.alcm_client import ALCMClient, GracefulALCMClient
    inner = ALCMClient(base_url="http://localhost:9999", timeout=1)
    client = GracefulALCMClient(inner)
    assert client.is_available is True  # Optimistic start
