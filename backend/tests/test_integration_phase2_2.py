"""
Phase 2.2 Integration Verification Test Suite:
1. PostgreSQL Dialect, Schema & Migration DDL Validation
2. Shared Redis Rate Limiting & Multi-Worker State Verification
3. Redis Fail-Closed vs Development Fallback Semantics
4. Process Restart & Shared Counter Persistence
5. Concurrent PIN Race Condition Resistance
6. Security Endpoint Integrity & Production Failures
"""
import concurrent.futures
import os
import time
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_mock_engine
from sqlalchemy.dialects import postgresql

from app.core.config import Settings
from app.core.pin_security import PinAttemptTracker
from app.core.rate_limiter import (
    BaseRateLimiter,
    InMemoryRateLimiter,
    RateLimiterUnavailableError,
    RedisRateLimiter,
)
from app.models.base import Base
from app.models.enums import UserRole
from app.models.user import User


# ── 1. PostgreSQL Schema & Dialect DDL Validation ────────────────────────────

def test_postgresql_dialect_ddl_generation():
    """
    Validates that all SQLAlchemy models produce valid PostgreSQL DDL statements
    under the Psycopg 3 dialect (postgresql+psycopg://).
    Tests tables, foreign keys, unique constraints, and PostgreSQL-native types.
    """
    statements = []

    def dump_ddl(sql, *multiparams, **params):
        statements.append(str(sql.compile(dialect=postgresql.dialect())))

    mock_engine = create_mock_engine("postgresql+psycopg://", dump_ddl)
    Base.metadata.create_all(mock_engine)

    full_ddl = "\n".join(statements)

    # Verify PostgreSQL table generation
    assert "CREATE TABLE users" in full_ddl
    assert "CREATE TABLE surplus_donations" in full_ddl
    assert "CREATE TABLE server_sessions" in full_ddl
    assert "CREATE TABLE audit_events" in full_ddl
    assert "CREATE TABLE student_attendance" in full_ddl

    # Verify PostgreSQL-specific types and constraints
    assert "JSON" in full_ddl or "json" in full_ddl.lower()
    assert "TIMESTAMP WITH TIME ZONE" in full_ddl
    assert "BOOLEAN" in full_ddl
    assert "CONSTRAINT uq_student_attendance_date_meal UNIQUE" in full_ddl
    assert "FOREIGN KEY(user_id) REFERENCES users (id)" in full_ddl


def test_postgresql_live_connection_or_documented_limitation():
    """
    Checks if a real PostgreSQL instance is provided via TEST_POSTGRES_URL or DATABASE_URL.
    If unavailable, asserts that the limitation is explicitly reported rather than falsely claimed.
    """
    test_pg_url = os.environ.get("TEST_POSTGRES_URL") or os.environ.get("POSTGRES_URL")

    if not test_pg_url:
        # Documented limitation: No local PostgreSQL service is running on this Windows host
        pytest.skip(
            "PostgreSQL integration: No live PostgreSQL container or service is available locally. "
            "Reported limitation per Phase 2.2 requirements."
        )

    # If live PostgreSQL is configured in environment, exercise live connection
    from sqlalchemy import create_engine, text
    engine = create_engine(test_pg_url)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT version();")).scalar()
        assert "PostgreSQL" in res


# ── 2. Redis Shared Multi-Worker & Process Restart Tests ─────────────────────

class MockSharedRedisState:
    """Thread-safe in-memory store simulating an external shared Redis instance."""
    def __init__(self):
        self.lists: dict[str, list[str]] = {}
        self.kv: dict[str, str] = {}
        self.ttls: dict[str, float] = {}

    def rpush(self, key: str, val: str) -> None:
        if key not in self.lists:
            self.lists[key] = []
        self.lists[key].append(val)

    def lrange(self, key: str, start: int, stop: int) -> list[str]:
        return self.lists.get(key, [])

    def incr(self, key: str) -> int:
        cur = int(self.kv.get(key, 0)) + 1
        self.kv[key] = str(cur)
        return cur

    def set(self, key: str, val: str, ex: int = 0) -> None:
        self.kv[key] = val
        if ex > 0:
            self.ttls[key] = time.time() + ex

    def exists(self, key: str) -> bool:
        if key in self.ttls and time.time() > self.ttls[key]:
            self.kv.pop(key, None)
            return False
        return key in self.kv or key in self.lists

    def ttl(self, key: str) -> int:
        if key in self.ttls:
            rem = int(self.ttls[key] - time.time())
            return max(rem, 0)
        return -1

    def delete(self, *keys) -> None:
        for k in keys:
            self.kv.pop(k, None)
            self.lists.pop(k, None)
            self.ttls.pop(k, None)

    def expire(self, key: str, seconds: int) -> None:
        self.ttls[key] = time.time() + seconds

    def ping(self) -> bool:
        return True

    def pipeline(self):
        parent = self
        class Pipe:
            def __init__(self):
                self.actions = []
            def rpush(self, key, val):
                self.actions.append(lambda: parent.rpush(key, val))
                return self
            def expire(self, key, sec):
                self.actions.append(lambda: parent.expire(key, sec))
                return self
            def execute(self):
                for a in self.actions:
                    a()
        return Pipe()


def test_redis_multi_worker_shared_counters():
    """
    Simulates multiple separate application worker processes communicating with a shared Redis instance.
    Demonstrates that limits are enforced across workers.
    """
    shared_redis = MockSharedRedisState()

    # Create limiter for Worker A
    limiter_worker_a = RedisRateLimiter(redis_url="redis://localhost:6379/0", fallback_to_memory=False)
    limiter_worker_a._redis_client = shared_redis

    # Create limiter for Worker B
    limiter_worker_b = RedisRateLimiter(redis_url="redis://localhost:6379/0", fallback_to_memory=False)
    limiter_worker_b._redis_client = shared_redis

    # Worker A records 4 attempts from client IP
    test_ip = "192.168.10.50"
    for _ in range(4):
        limiter_worker_a.record_ip_attempt(test_ip)

    # Worker B checks rate limit (max 5 attempts)
    assert limiter_worker_b.is_ip_rate_limited(test_ip, max_attempts=5, window_seconds=60) is False

    # Worker B records the 5th attempt
    limiter_worker_b.record_ip_attempt(test_ip)

    # Both Worker A and Worker B now enforce rate limit
    assert limiter_worker_a.is_ip_rate_limited(test_ip, max_attempts=5, window_seconds=60) is True
    assert limiter_worker_b.is_ip_rate_limited(test_ip, max_attempts=5, window_seconds=60) is True


def test_redis_counters_survive_process_restart():
    """
    Simulates a worker crashing or restarting:
    Worker 1 records failed account attempts and terminates;
    Worker 2 initializes and immediately enforces the existing lockout.
    """
    shared_redis = MockSharedRedisState()

    # Worker Process 1 records failures for target user
    worker_1 = RedisRateLimiter(redis_url="redis://localhost:6379/0", fallback_to_memory=False)
    worker_1._redis_client = shared_redis
    target_account = "student_victim"

    for _ in range(5):
        worker_1.record_account_failure(target_account, lockout_threshold=5, lockout_duration=600)

    # Worker 1 terminates (instance destroyed)
    del worker_1

    # Worker Process 2 starts up fresh with new PID/instance
    worker_2 = RedisRateLimiter(redis_url="redis://localhost:6379/0", fallback_to_memory=False)
    worker_2._redis_client = shared_redis

    # Worker 2 immediately recognizes the account is locked from the shared backend
    assert worker_2.is_account_locked(target_account) is True
    rem = worker_2.get_lockout_remaining(target_account)
    assert rem is not None and rem > 500


# ── 3. Redis Fail-Closed vs Development Fallback Semantics ───────────────────

def test_redis_production_fail_closed_raises_error():
    """
    CRITICAL SECURITY CHECK:
    In production mode (or when fallback_to_memory=False), an unavailable Redis
    backend MUST fail closed by raising RateLimiterUnavailableError rather than
    silently downgrading to per-process in-memory limits.
    """
    limiter = RedisRateLimiter(
        redis_url="redis://unreachable-redis-host:6379/0",
        fallback_to_memory=False,
    )
    # Redis is unreachable
    assert limiter._redis_client is None
    assert limiter._fallback is None

    # Operations must fail closed
    with pytest.raises(RateLimiterUnavailableError):
        limiter.record_ip_attempt("1.2.3.4")

    with pytest.raises(RateLimiterUnavailableError):
        limiter.is_ip_rate_limited("1.2.3.4", max_attempts=5, window_seconds=60)

    with pytest.raises(RateLimiterUnavailableError):
        limiter.record_account_failure("user1", lockout_threshold=5, lockout_duration=600)

    with pytest.raises(RateLimiterUnavailableError):
        limiter.is_account_locked("user1")


def test_redis_development_fallback_permitted():
    """In development mode (fallback_to_memory=True), limiter falls back safely to memory."""
    limiter = RedisRateLimiter(
        redis_url="redis://unreachable-redis-host:6379/0",
        fallback_to_memory=True,
    )
    # Redis is unreachable, but in-memory fallback is active
    assert limiter._redis_client is None
    assert limiter._fallback is not None

    # Operations succeed via local fallback
    limiter.record_ip_attempt("1.2.3.4")
    assert limiter.is_ip_rate_limited("1.2.3.4", max_attempts=5, window_seconds=60) is False


def test_auth_login_endpoint_returns_503_when_shared_limiter_unavailable(client: TestClient):
    """
    When the production shared rate limiter fails closed,
    the login endpoint returns HTTP 503 Service Unavailable.
    """
    with patch("app.api.auth.login_tracker.is_ip_rate_limited", side_effect=RateLimiterUnavailableError("Redis down")):
        response = client.post(
            "/api/v1/auth/login",
            json={"identifier": "test_user", "password": "password"},
        )
        assert response.status_code == 503
        assert "temporarily unavailable" in response.json()["detail"]


# ── 4. Concurrent PIN Attempts Race Condition Resistance ─────────────────────

def test_concurrent_pin_attempts_race_condition():
    """
    Verifies that simultaneous concurrent verification attempts cannot bypass
    the configured lockout threshold (3 attempts).
    """
    tracker = PinAttemptTracker(max_attempts=3, window_seconds=900)
    donation_id = "DON-CONCURRENT-RACE"

    def attempt_failure():
        return tracker.record_failure(donation_id)

    # Fire 10 concurrent threads simultaneously
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(attempt_failure) for _ in range(10)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    # Lockout must be engaged
    assert tracker.is_locked(donation_id) is True
    # Exactly 10 total recorded attempts
    assert tracker.get_attempts(donation_id) == 10
    assert tracker.get_lockout_remaining(donation_id) is not None


# ── 5. Operational Readiness & Configuration Validation ──────────────────────

def test_production_rejects_weak_or_missing_secrets():
    """
    Verifies that Settings in production strictly rejects missing or weak secrets,
    wildcard CORS origins, or fallback flags.
    """
    # 1. Missing SESSION_SECRET
    with pytest.raises(ValidationError, match="SESSION_SECRET is required in production"):
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL="postgresql+psycopg://user:pass@localhost:5432/messaver",
            SESSION_SECRET=None,
            CSRF_SECRET="prod-csrf-secret-key-32-chars-long!!",
            PIN_PEPPER="prod-pin-pepper-secret-32-chars-long!",
        )

    # 2. Weak CSRF_SECRET (< 32 chars)
    with pytest.raises(ValidationError, match="CSRF_SECRET is required in production"):
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL="postgresql+psycopg://user:pass@localhost:5432/messaver",
            SESSION_SECRET="prod-session-secret-key-32-chars-long!",
            CSRF_SECRET="too-short",
            PIN_PEPPER="prod-pin-pepper-secret-32-chars-long!",
        )

    # 3. Weak PIN_PEPPER (< 16 chars)
    with pytest.raises(ValidationError, match="PIN_PEPPER is required in production"):
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL="postgresql+psycopg://user:pass@localhost:5432/messaver",
            SESSION_SECRET="prod-session-secret-key-32-chars-long!",
            CSRF_SECRET="prod-csrf-secret-key-32-chars-long!!",
            PIN_PEPPER="short",
        )

    # 4. Fallback to memory explicitly rejected in production
    with pytest.raises(ValidationError, match="REDIS_FALLBACK_TO_MEMORY cannot be True in production"):
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL="postgresql+psycopg://user:pass@localhost:5432/messaver",
            SESSION_SECRET="prod-session-secret-key-32-chars-long!",
            CSRF_SECRET="prod-csrf-secret-key-32-chars-long!!",
            PIN_PEPPER="prod-pin-pepper-secret-32-chars-long!",
            REDIS_FALLBACK_TO_MEMORY=True,
        )
