"""Tests for cursor-based pagination utility."""
import pytest
from app.utils.pagination import encode_cursor, decode_cursor


def test_encode_decode_cursor_roundtrip():
    """Cursor encodes and decodes cleanly."""
    record_id = "abc123-def456"
    cursor = encode_cursor(record_id)
    assert isinstance(cursor, str)
    assert decode_cursor(cursor) == record_id


def test_decode_invalid_cursor():
    """Invalid cursor returns None, doesn't crash."""
    assert decode_cursor("not-a-valid-cursor") is None
    assert decode_cursor("") is None


def test_cursor_is_opaque():
    """Cursor should not be plaintext record ID."""
    cursor = encode_cursor("test-id")
    assert cursor != "test-id"
