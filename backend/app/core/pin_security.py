"""
Cryptographic security module for 4-digit pickup PINs.

A 4-digit PIN (0000-9999) has a small search space of only 10,000 combinations.
Standard password hashing (even bcrypt) is vulnerable to fast offline brute-force
if the database is leaked.

To mitigate this, MessSaver employs:
1. Server-Side Secret Pepper: A high-entropy secret kept strictly OUTSIDE the database.
   Without the pepper, an attacker with a database dump cannot verify guessed PINs.
2. Contextual Domain Separation: The PIN is keyed together with the unique donation_id:
   HMAC-SHA256(pepper, f"{donation_id}:{pin}")
   This prevents rainbow tables and cross-donation correlation.
3. Bcrypt Defense-in-Depth: The keyed digest is then hashed with bcrypt.
4. Bounded Attempt Throttling: Maximum 3 failed verification attempts trigger a
   bounded 15-minute lockout (preventing permanent DoS and food spoilage).
5. Authorized Staff Recovery: Managers and Admins can securely reset lockout or rotate
   PINs with an immutable audit trail.
6. Single-Use Lifecycle: Once successfully claimed, the PIN record is marked redeemed in an atomic transaction.
"""
import hashlib
import hmac
import logging
import time
from collections import defaultdict
from threading import Lock
from typing import Optional

from app.core.config import get_settings
from app.core.security import hash_secret, verify_secret

logger = logging.getLogger("messaver.pin_security")

DEFAULT_MAX_PIN_ATTEMPTS = 3
DEFAULT_PIN_LOCKOUT_WINDOW_SECONDS = 900  # 15 minutes


def _compute_keyed_pin(pin: str, donation_id: str, pepper: str) -> str:
    """
    Computes a keyed HMAC-SHA256 digest binding the 4-digit PIN, donation_id,
    and server-side pepper.
    """
    message = f"{donation_id}:{pin}".encode("utf-8")
    key = pepper.encode("utf-8")
    return hmac.new(key, message, hashlib.sha256).hexdigest()


def hash_pickup_pin(
    pin: str,
    donation_id: str,
    pepper: Optional[str] = None,
) -> str:
    """
    Securely hashes a 4-digit pickup PIN using server pepper + bcrypt.
    The output is safe to store in the database.
    """
    if len(pin) != 4 or not pin.isdigit():
        raise ValueError("Pickup PIN must be exactly 4 numeric digits")

    effective_pepper = pepper or get_settings().PIN_PEPPER
    if not effective_pepper:
        raise ValueError("PIN_PEPPER must be configured to hash pickup PINs")

    keyed_digest = _compute_keyed_pin(pin, donation_id, effective_pepper)
    return hash_secret(keyed_digest)


def verify_pickup_pin(
    plain_pin: str,
    donation_id: str,
    stored_hash: str,
    pepper: Optional[str] = None,
) -> bool:
    """
    Verifies a supplied PIN against the stored hash using the server pepper.
    Returns True if valid, False otherwise.
    Never leaks timing information or secret material.
    """
    if len(plain_pin) != 4 or not plain_pin.isdigit():
        return False

    effective_pepper = pepper or get_settings().PIN_PEPPER
    if not effective_pepper:
        logger.error("PIN_PEPPER is missing; cannot verify pickup PIN")
        return False

    keyed_digest = _compute_keyed_pin(plain_pin, donation_id, effective_pepper)
    return verify_secret(keyed_digest, stored_hash)


class PinAttemptTracker:
    """
    Thread-safe tracker for failed PIN verification attempts per donation.
    Enforces a bounded lockout policy: after MAX_ATTEMPTS failures, verification
    is locked for LOCKOUT_WINDOW_SECONDS (default 15 minutes).
    Prevents online brute-force while avoiding permanent unrecoverable food spoilage DoS.
    """

    def __init__(
        self,
        max_attempts: int = DEFAULT_MAX_PIN_ATTEMPTS,
        window_seconds: int = DEFAULT_PIN_LOCKOUT_WINDOW_SECONDS,
    ):
        self._lock = Lock()
        # {donation_id: {"count": int, "locked_until": float, "history": list[float]}}
        self._failures: dict[str, dict] = defaultdict(
            lambda: {"count": 0, "locked_until": 0.0, "history": []}
        )
        self._max_attempts = max_attempts
        self._window_seconds = window_seconds

    def record_failure(self, donation_id: str) -> int:
        with self._lock:
            now = time.monotonic()
            entry = self._failures[donation_id]
            # Prune attempts outside window
            cutoff = now - self._window_seconds
            entry["history"] = [t for t in entry["history"] if t > cutoff]
            entry["history"].append(now)
            entry["count"] = len(entry["history"])

            if entry["count"] >= self._max_attempts:
                entry["locked_until"] = now + self._window_seconds
                logger.warning(
                    f"Donation '{donation_id}' PIN temporarily locked for {self._window_seconds}s "
                    f"after {entry['count']} failed attempts"
                )
            return entry["count"]

    def is_locked(self, donation_id: str) -> bool:
        with self._lock:
            entry = self._failures.get(donation_id)
            if not entry:
                return False
            now = time.monotonic()
            if entry["locked_until"] > now:
                return True
            # Lockout expired: reset
            if entry["locked_until"] > 0 and now >= entry["locked_until"]:
                entry["count"] = 0
                entry["locked_until"] = 0.0
                entry["history"] = []
            return False

    def get_lockout_remaining(self, donation_id: str) -> Optional[int]:
        with self._lock:
            entry = self._failures.get(donation_id)
            if not entry or entry["locked_until"] <= time.monotonic():
                return None
            return int(entry["locked_until"] - time.monotonic())

    def get_attempts(self, donation_id: str) -> int:
        with self._lock:
            entry = self._failures.get(donation_id)
            return entry["count"] if entry else 0

    def reset(self, donation_id: str) -> None:
        """Resets the attempt counter and clears lockout (used in staff recovery)."""
        with self._lock:
            if donation_id in self._failures:
                del self._failures[donation_id]

    def clear_all(self) -> None:
        """Clears all records (used in test isolation)."""
        with self._lock:
            self._failures.clear()


# Global attempt tracker for PIN verification
pin_tracker = PinAttemptTracker()
