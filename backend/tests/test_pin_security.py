"""
Unit tests for pickup PIN security module:
- Keyed hashing with server-side pepper and donation_id context
- Domain separation between different donations
- Tamper resistance (wrong PIN, wrong donation_id, wrong pepper)
- Attempt throttling and lockout tracking
- Validation of PIN format (must be 4 numeric digits)
"""
import pytest
from app.core.pin_security import (
    PinAttemptTracker,
    hash_pickup_pin,
    verify_pickup_pin,
)

TEST_PEPPER = "test-secret-pin-pepper-32-chars-long!"


def test_pin_hashing_and_successful_verification():
    """Verify correct 4-digit PIN can be verified against its stored hash."""
    pin = "4819"
    donation_id = "don-test-001"

    hashed = hash_pickup_pin(pin, donation_id, pepper=TEST_PEPPER)
    assert isinstance(hashed, str)
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")

    # Correct verification
    assert verify_pickup_pin(pin, donation_id, hashed, pepper=TEST_PEPPER) is True


def test_pin_verification_wrong_pin():
    """Verify wrong PIN is rejected."""
    hashed = hash_pickup_pin("1234", "don-001", pepper=TEST_PEPPER)
    assert verify_pickup_pin("1235", "don-001", hashed, pepper=TEST_PEPPER) is False
    assert verify_pickup_pin("0000", "don-001", hashed, pepper=TEST_PEPPER) is False


def test_pin_verification_domain_separation():
    """
    CRITICAL SECURITY CHECK:
    The same PIN '1234' on 'don-001' must NOT verify on 'don-002'.
    Prevents cross-donation rainbow table attacks.
    """
    hashed_don1 = hash_pickup_pin("1234", "don-001", pepper=TEST_PEPPER)

    # Verifying against a different donation_id must fail
    assert verify_pickup_pin("1234", "don-002", hashed_don1, pepper=TEST_PEPPER) is False


def test_pin_verification_wrong_pepper():
    """
    CRITICAL SECURITY CHECK:
    Verifying with an incorrect server pepper fails, meaning a database leak
    alone does not allow offline verification without the server-side pepper.
    """
    hashed = hash_pickup_pin("9999", "don-001", pepper=TEST_PEPPER)
    different_pepper = "completely-different-pepper-secret-key"

    assert verify_pickup_pin("9999", "don-001", hashed, pepper=different_pepper) is False


def test_pin_format_validation():
    """Verify non-4-digit or non-numeric PINs are rejected."""
    # Too short
    with pytest.raises(ValueError):
        hash_pickup_pin("12", "don-001", pepper=TEST_PEPPER)

    # Too long
    with pytest.raises(ValueError):
        hash_pickup_pin("12345", "don-001", pepper=TEST_PEPPER)

    # Non-numeric
    with pytest.raises(ValueError):
        hash_pickup_pin("abcd", "don-001", pepper=TEST_PEPPER)

    # Verification with invalid format returns False safely without crashing
    hashed = hash_pickup_pin("5555", "don-001", pepper=TEST_PEPPER)
    assert verify_pickup_pin("555", "don-001", hashed, pepper=TEST_PEPPER) is False
    assert verify_pickup_pin("55555", "don-001", hashed, pepper=TEST_PEPPER) is False
    assert verify_pickup_pin("abcd", "don-001", hashed, pepper=TEST_PEPPER) is False


def test_pin_attempt_throttling():
    """Verify attempt tracker locks out after 3 failed attempts."""
    tracker = PinAttemptTracker(max_attempts=3)
    donation_id = "don-brute-force-test"

    assert tracker.is_locked(donation_id) is False
    assert tracker.get_attempts(donation_id) == 0

    # Attempt 1
    tracker.record_failure(donation_id)
    assert tracker.is_locked(donation_id) is False
    assert tracker.get_attempts(donation_id) == 1

    # Attempt 2
    tracker.record_failure(donation_id)
    assert tracker.is_locked(donation_id) is False
    assert tracker.get_attempts(donation_id) == 2

    # Attempt 3 -> Locked
    tracker.record_failure(donation_id)
    assert tracker.is_locked(donation_id) is True
    assert tracker.get_attempts(donation_id) == 3

    # Reset
    tracker.reset(donation_id)
    assert tracker.is_locked(donation_id) is False
    assert tracker.get_attempts(donation_id) == 0
