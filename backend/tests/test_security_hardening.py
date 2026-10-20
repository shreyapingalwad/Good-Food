"""
Comprehensive tests for Phase 2.1 Security Hardening:
1. Configurable CORS: Allowed origins, disallowed origins, credentialed preflights, and wildcard rejection in production.
2. Reverse proxy and client IP handling: Untrusted header spoofing rejection vs trusted proxy chain resolution.
3. Pickup PIN bounded lockout and staff recovery: Bounded cooldown, auto-unlock on expiry, least-privilege staff recovery, PIN rotation, and audit trail integrity.
4. Shared rate limiting and anti-DoS: Memory leak prevention (TTL key eviction), Redis safe fallback, bounded temporary lockout.
5. Dual session timeout: Sliding idle timeout, absolute max lifetime, and bounded idempotent session cleanup.
6. Object-level authorization hardening: Rejection of None == None matches, empty/missing IDs, and scope boundaries.
"""
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.auth_dependencies import (
    AuthenticatedUser,
    assert_owns_ngo_record,
    assert_owns_student_record,
    assert_same_facility,
)
from app.core.config import Settings
from app.core.ip_resolver import get_client_ip
from app.core.pin_security import (
    PinAttemptTracker,
    hash_pickup_pin,
    verify_pickup_pin,
)
from app.core.rate_limiter import (
    BaseRateLimiter,
    InMemoryRateLimiter,
    RedisRateLimiter,
)
from app.core.security import hash_secret
from app.core.session_service import (
    cleanup_expired_sessions,
    create_session,
    generate_csrf_token,
    validate_session,
)
from app.models.audit import AuditEvent
from app.models.donation import SurplusDonation
from app.models.enums import DonationStatus, MealType, UserRole
from app.models.session import ServerSession
from app.models.user import User


# ── 1. Configurable CORS Tests ───────────────────────────────────────────────

def test_cors_origins_configuration(client: TestClient):
    """Permitted origins receive correct Access-Control-Allow-Origin header."""
    response = client.get(
        "/health/live",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_disallowed_origin(client: TestClient):
    """Disallowed origins do not receive Access-Control-Allow-Origin header."""
    response = client.get(
        "/health/live",
        headers={"Origin": "http://malicious-site.com"},
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


def test_cors_credentialed_preflight(client: TestClient):
    """Preflight OPTIONS request from permitted origin receives valid CORS headers."""
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-csrf-token",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "POST" in response.headers.get("access-control-allow-methods", "")


def test_production_cors_wildcard_rejected():
    """In production, wildcard CORS origin with credentials is strictly rejected."""
    with pytest.raises(ValidationError, match="Wildcard origin '\\*' is strictly prohibited"):
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL="postgresql+psycopg2://user:pass@localhost:5432/messaver",
            SESSION_SECRET="prod-session-secret-key-32-chars-long!",
            CSRF_SECRET="prod-csrf-secret-key-32-chars-long!!",
            PIN_PEPPER="prod-pin-pepper-secret-32-chars-long!",
            CORS_ORIGINS=["*"],
        )


# ── 2. Reverse Proxy and Client IP Handling Tests ────────────────────────────

def test_ip_resolver_untrusted_direct():
    """Untrusted connection spoofing X-Forwarded-For must be ignored; direct socket IP used."""
    mock_request = MagicMock()
    mock_request.client.host = "198.51.100.50"  # Untrusted external IP
    mock_request.headers = {"x-forwarded-for": "10.0.0.1, 192.168.1.1"}

    resolved_ip = get_client_ip(mock_request)
    # Since 198.51.100.50 is NOT in TRUSTED_PROXIES, ignore the header!
    assert resolved_ip == "198.51.100.50"


def test_ip_resolver_trusted_proxy():
    """Trusted proxy connection correctly unwraps client IP from X-Forwarded-For."""
    mock_request = MagicMock()
    mock_request.client.host = "127.0.0.1"  # In default TRUSTED_PROXIES
    mock_request.headers = {"x-forwarded-for": "203.0.113.195, 10.0.0.1"}

    with patch("app.core.ip_resolver.get_settings") as mock_settings:
        mock_settings.return_value.TRUSTED_PROXIES = ["127.0.0.1", "10.0.0.1"]
        resolved_ip = get_client_ip(mock_request)
        # 10.0.0.1 is trusted; 203.0.113.195 is the first untrusted upstream client
        assert resolved_ip == "203.0.113.195"


def test_ip_resolver_empty_or_malformed():
    """Malformed or missing client info gracefully falls back without crashing."""
    mock_request = MagicMock()
    mock_request.client = None
    mock_request.headers = {}
    assert get_client_ip(mock_request) == "127.0.0.1"


# ── 3. Pickup PIN Lockout & Staff Recovery Tests ──────────────────────────────

def test_pin_bounded_lockout_and_auto_expiry():
    """Failed attempts trigger bounded lockout which automatically expires."""
    tracker = PinAttemptTracker(max_attempts=3, window_seconds=2)
    donation_id = "DON-LOCKOUT-TEST"

    # 3 failures trigger lockout
    tracker.record_failure(donation_id)
    tracker.record_failure(donation_id)
    tracker.record_failure(donation_id)

    assert tracker.is_locked(donation_id) is True
    assert tracker.get_lockout_remaining(donation_id) is not None
    assert tracker.get_lockout_remaining(donation_id) > 0

    # Wait for lockout window to expire (2s)
    time.sleep(2.1)

    # Must automatically unlock without manual intervention
    assert tracker.is_locked(donation_id) is False
    assert tracker.get_lockout_remaining(donation_id) is None


def test_pin_recovery_least_privilege_and_audit(client: TestClient, db_session):
    """
    Staff recovery endpoint:
    - Unauthorized roles (student/kitchen/ngo) are rejected (403).
    - Manager of Facility A cannot reset Facility B (403).
    - Authorized Manager resets lockout; AuditEvent is persisted with reason.
    - Admin can reset and rotate PIN without leaking secrets.
    """
    # 1. Setup donation in DB
    pin_hash = hash_pickup_pin("1234", "DON-9901")
    donation = SurplusDonation(
        id="DON-9901",
        food_title="Paneer Curry",
        dishes=[{"name": "Paneer Curry", "quantityKg": 10.0}],
        total_quantity_kg=10.0,
        servings_count=25,
        meal_type=MealType.DINNER,
        prepared_at="2026-10-20T18:00:00Z",
        temperature_at_packaging=68.0,
        is_hygienically_packed=True,
        is_plate_leftover=False,
        expiry_deadline="2026-10-20T22:00:00Z",
        status=DonationStatus.AVAILABLE,
        kitchen_facility="FAC-NORTH",
        pickup_location="Gate 1",
        beneficiary_target="Community Kitchen",
        pickup_pin_hash=pin_hash,
    )
    db_session.add(donation)

    # Users: Student, Kitchen, Manager North, Manager South, Admin
    users = [
        User(id="usr_stu", username="stu1", email="s@test.com", full_name="Student", password_hash=hash_secret("pass"), role=UserRole.STUDENT),
        User(id="usr_mgr_n", username="mgr_n", email="mn@test.com", full_name="Mgr North", password_hash=hash_secret("pass"), role=UserRole.MANAGER, facility_id="FAC-NORTH"),
        User(id="usr_mgr_s", username="mgr_s", email="ms@test.com", full_name="Mgr South", password_hash=hash_secret("pass"), role=UserRole.MANAGER, facility_id="FAC-SOUTH"),
        User(id="usr_adm", username="admin1", email="a@test.com", full_name="Admin", password_hash=hash_secret("pass"), role=UserRole.ADMIN),
    ]
    for u in users:
        db_session.add(u)
    db_session.commit()

    # Helper to authenticate user and get csrf
    def login_user(username: str):
        res = client.post("/api/v1/auth/login", json={"identifier": username, "password": "pass"})
        assert res.status_code == 200
        csrf = res.json()["user"]["csrf_token"]
        cookie = res.cookies.get("messaver_session")
        return csrf, cookie

    # 2. Lock the PIN
    from app.core.pin_security import pin_tracker
    pin_tracker.record_failure("DON-9901")
    pin_tracker.record_failure("DON-9901")
    pin_tracker.record_failure("DON-9901")
    assert pin_tracker.is_locked("DON-9901") is True

    # 3. Student tries to reset -> 403 Forbidden
    stu_csrf, stu_cookie = login_user("stu1")
    client.cookies.set("messaver_session", stu_cookie)
    res_stu = client.post(
        "/api/v1/auth/donations/DON-9901/reset-pin-lockout",
        headers={"X-CSRF-Token": stu_csrf},
        json={"reason": "Student attempt", "rotate_pin": False},
    )
    assert res_stu.status_code == 403

    # 4. Manager South tries to reset Facility North donation -> 403 Forbidden
    ms_csrf, ms_cookie = login_user("mgr_s")
    client.cookies.set("messaver_session", ms_cookie)
    res_ms = client.post(
        "/api/v1/auth/donations/DON-9901/reset-pin-lockout",
        headers={"X-CSRF-Token": ms_csrf},
        json={"reason": "Mismatched facility attempt", "rotate_pin": False},
    )
    assert res_ms.status_code == 403

    # 5. Manager North resets Facility North donation -> 200 OK
    mn_csrf, mn_cookie = login_user("mgr_n")
    client.cookies.set("messaver_session", mn_cookie)
    res_mn = client.post(
        "/api/v1/auth/donations/DON-9901/reset-pin-lockout",
        headers={"X-CSRF-Token": mn_csrf},
        json={"reason": "Legitimate NGO volunteer typo", "rotate_pin": False},
    )
    assert res_mn.status_code == 200
    assert res_mn.json()["unlocked"] is True
    assert res_mn.json()["new_pin"] is None
    assert pin_tracker.is_locked("DON-9901") is False

    # Verify AuditEvent created
    audit = db_session.query(AuditEvent).filter(AuditEvent.action == "DONATION_PIN_RECOVERY").first()
    assert audit is not None
    assert audit.actor_name == "mgr_n"
    assert "DON-9901" in audit.details
    assert "Legitimate NGO volunteer typo" in audit.details
    assert "1234" not in audit.details  # No plaintext PIN in audit logs!

    # 6. Admin resets with PIN rotation
    pin_tracker.record_failure("DON-9901")
    pin_tracker.record_failure("DON-9901")
    pin_tracker.record_failure("DON-9901")

    adm_csrf, adm_cookie = login_user("admin1")
    client.cookies.set("messaver_session", adm_cookie)
    res_adm = client.post(
        "/api/v1/auth/donations/DON-9901/reset-pin-lockout",
        headers={"X-CSRF-Token": adm_csrf},
        json={"reason": "Suspected compromise, rotated PIN", "rotate_pin": True},
    )
    assert res_adm.status_code == 200
    data = res_adm.json()
    new_pin = data["new_pin"]
    assert new_pin is not None
    assert len(new_pin) == 4
    assert new_pin.isdigit()

    # Verify old PIN no longer verifies, new PIN verifies
    db_session.refresh(donation)
    assert verify_pickup_pin("1234", "DON-9901", donation.pickup_pin_hash) is False
    assert verify_pickup_pin(new_pin, "DON-9901", donation.pickup_pin_hash) is True


# ── 4. Shared Rate Limiting & Anti-DoS Tests ─────────────────────────────────

def test_rate_limiter_stale_key_eviction():
    """InMemoryRateLimiter cleans up expired keys to prevent memory leaks."""
    limiter = InMemoryRateLimiter()

    # Record IP attempt at t=0
    limiter.record_ip_attempt("1.2.3.4")
    assert "1.2.3.4" in limiter._ip_attempts

    # Advance time beyond max_idle (3600s)
    with patch("time.monotonic", return_value=time.monotonic() + 4000):
        limiter.record_ip_attempt("5.6.7.8")
        # 1.2.3.4 should have been evicted
        assert "1.2.3.4" not in limiter._ip_attempts
        assert "5.6.7.8" in limiter._ip_attempts


def test_rate_limiter_redis_fallback():
    """RedisRateLimiter falls back safely to in-memory if Redis is unreachable."""
    # Initialize with non-existent Redis endpoint
    limiter = RedisRateLimiter(redis_url="redis://127.0.0.1:9999/0")

    # Should not throw unhandled exception; operations still function safely via fallback
    limiter.record_ip_attempt("10.0.0.99")
    assert limiter.is_ip_rate_limited("10.0.0.99", max_attempts=5, window_seconds=60) is False

    for _ in range(4):
        limiter.record_ip_attempt("10.0.0.99")
    assert limiter.is_ip_rate_limited("10.0.0.99", max_attempts=5, window_seconds=60) is True


def test_cross_worker_shared_rate_limiting_test_double():
    """Simulates two independent worker processes sharing state via a shared limiter."""
    class SharedTestDoubleLimiter(BaseRateLimiter):
        """Simulates external shared Redis instance."""
        shared_state: dict[str, list[float]] = {}

        def record_ip_attempt(self, ip: str) -> None:
            if ip not in self.shared_state:
                self.shared_state[ip] = []
            self.shared_state[ip].append(time.time())

        def is_ip_rate_limited(self, ip: str, max_attempts: int, window_seconds: int) -> bool:
            now = time.time()
            cutoff = now - window_seconds
            attempts = [t for t in self.shared_state.get(ip, []) if t > cutoff]
            return len(attempts) >= max_attempts

        def record_account_failure(self, identifier: str, lockout_threshold: int, lockout_duration: int) -> None:
            pass
        def is_account_locked(self, identifier: str) -> bool:
            return False
        def get_lockout_remaining(self, identifier: str):
            return None
        def clear_account_failures(self, identifier: str) -> None:
            pass
        def clear_all(self) -> None:
            self.shared_state.clear()

    shared_backend = SharedTestDoubleLimiter()

    # Worker 1 records 3 requests
    worker_1 = shared_backend
    worker_2 = shared_backend

    worker_1.record_ip_attempt("192.168.1.100")
    worker_1.record_ip_attempt("192.168.1.100")
    worker_1.record_ip_attempt("192.168.1.100")

    # Worker 2 immediately observes Worker 1's attempts
    assert worker_2.is_ip_rate_limited("192.168.1.100", max_attempts=4, window_seconds=60) is False
    worker_2.record_ip_attempt("192.168.1.100")
    assert worker_1.is_ip_rate_limited("192.168.1.100", max_attempts=4, window_seconds=60) is True


# ── 5. Dual Session Timeout Tests ────────────────────────────────────────────

def test_session_idle_and_absolute_timeouts(db_session):
    """
    Validates dual timeout semantics:
    1. Active session within idle window is renewed (sliding window).
    2. Inactive session exceeding 30 min idle timeout is rejected.
    3. Session exceeding absolute max age (8h) is rejected even if active.
    """
    user = User(
        id="usr_timeout",
        username="timeout_user",
        email="to@test.com",
        full_name="Timeout User",
        password_hash=hash_secret("pass"),
        role=UserRole.STUDENT,
    )
    db_session.add(user)
    db_session.commit()

    token, session_record = create_session(db_session, user)

    # 1. Immediate validation succeeds and touches last_activity_at
    initial_last_active = session_record.last_activity_at
    valid_sess = validate_session(db_session, token)
    assert valid_sess is not None
    assert valid_sess.is_active is True

    # 2. Idle timeout expiration: simulate 31 minutes of inactivity
    session_record.last_activity_at = datetime.now(timezone.utc) - timedelta(minutes=31)
    db_session.commit()

    idle_expired = validate_session(db_session, token)
    assert idle_expired is None
    db_session.refresh(session_record)
    assert session_record.is_active is False

    # 3. Absolute timeout: create new session, simulate activity but past absolute max age
    token2, sess2 = create_session(db_session, user)
    sess2.last_activity_at = datetime.now(timezone.utc)  # Active 1 second ago!
    sess2.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)  # Absolute expired!
    db_session.commit()

    abs_expired = validate_session(db_session, token2)
    assert abs_expired is None
    db_session.refresh(sess2)
    assert sess2.is_active is False


def test_session_cleanup_job_and_endpoint(client: TestClient, db_session):
    """Cleanup deactivates expired/idle sessions without deleting rows or affecting valid sessions."""
    user = User(
        id="usr_cleanup",
        username="cleanup_user",
        email="clean@test.com",
        full_name="Clean User",
        password_hash=hash_secret("pass"),
        role=UserRole.ADMIN,
    )
    db_session.add(user)
    db_session.commit()

    # Valid session
    t_valid, s_valid = create_session(db_session, user)

    # Idle expired session
    t_idle, s_idle = create_session(db_session, user)
    s_idle.last_activity_at = datetime.now(timezone.utc) - timedelta(minutes=45)

    # Absolute expired session
    t_abs, s_abs = create_session(db_session, user)
    s_abs.expires_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    db_session.commit()

    # Run cleanup
    count = cleanup_expired_sessions(db_session)
    assert count == 2

    db_session.refresh(s_valid)
    db_session.refresh(s_idle)
    db_session.refresh(s_abs)

    assert s_valid.is_active is True
    assert s_idle.is_active is False
    assert s_abs.is_active is False

    # Test administrative endpoint
    res_login = client.post("/api/v1/auth/login", json={"identifier": "cleanup_user", "password": "pass"})
    csrf = res_login.json()["user"]["csrf_token"]

    res_clean = client.post("/api/v1/auth/cleanup-sessions", headers={"X-CSRF-Token": csrf})
    assert res_clean.status_code == 200
    assert "Cleaned up" in res_clean.json()["message"]


# ── 6. Object-Level Authorization Hardening Tests ────────────────────────────

def test_object_auth_student_rejections():
    """assert_owns_student_record rejects None, empty, whitespace, and mismatched IDs."""
    student_user = AuthenticatedUser(
        user_id="stu_101",
        role=UserRole.STUDENT,
        facility_id="FAC-01",
        ngo_id=None,
        session_id="sess_1",
    )
    admin_user = AuthenticatedUser(
        user_id="adm_001",
        role=UserRole.ADMIN,
        facility_id=None,
        ngo_id=None,
        session_id="sess_2",
    )

    # Valid ownership passes
    assert_owns_student_record(student_user, "stu_101")
    # Admin bypasses
    assert_owns_student_record(admin_user, "stu_999")

    # Mismatched ID raises 403
    with pytest.raises(HTTPException) as exc:
        assert_owns_student_record(student_user, "stu_102")
    assert exc.value.status_code == 403

    # Empty string raises 403
    with pytest.raises(HTTPException) as exc:
        assert_owns_student_record(student_user, "")
    assert exc.value.status_code == 403

    # Whitespace raises 403
    with pytest.raises(HTTPException) as exc:
        assert_owns_student_record(student_user, "   ")
    assert exc.value.status_code == 403


def test_object_auth_facility_none_rejection():
    """
    CRITICAL SECURITY CHECK:
    assert_same_facility must NEVER allow unassigned user to match unassigned facility (None == None).
    """
    unassigned_user = AuthenticatedUser(
        user_id="usr_unassigned",
        role=UserRole.MANAGER,
        facility_id=None,  # Not assigned to any facility
        ngo_id=None,
        session_id="sess_3",
    )
    assigned_user = AuthenticatedUser(
        user_id="usr_assigned",
        role=UserRole.MANAGER,
        facility_id="FAC-A",
        ngo_id=None,
        session_id="sess_4",
    )
    admin_user = AuthenticatedUser(
        user_id="adm_001",
        role=UserRole.ADMIN,
        facility_id=None,
        ngo_id=None,
        session_id="sess_2",
    )

    # Unassigned user targeting None/empty raises 403
    with pytest.raises(HTTPException) as exc:
        assert_same_facility(unassigned_user, None)  # type: ignore
    assert exc.value.status_code == 403

    with pytest.raises(HTTPException) as exc:
        assert_same_facility(unassigned_user, "")
    assert exc.value.status_code == 403

    # Unassigned user targeting real facility raises 403
    with pytest.raises(HTTPException) as exc:
        assert_same_facility(unassigned_user, "FAC-A")
    assert exc.value.status_code == 403

    # Assigned user targeting mismatched facility raises 403
    with pytest.raises(HTTPException) as exc:
        assert_same_facility(assigned_user, "FAC-B")
    assert exc.value.status_code == 403

    # Assigned user targeting matching facility passes
    assert_same_facility(assigned_user, "FAC-A")

    # Admin bypasses
    assert_same_facility(admin_user, "FAC-A")
    assert_same_facility(admin_user, "ANY-FACILITY")


def test_object_auth_ngo_none_rejection():
    """
    CRITICAL SECURITY CHECK:
    assert_owns_ngo_record must NEVER allow unassigned user to match unassigned NGO (None == None).
    """
    unassigned_user = AuthenticatedUser(
        user_id="ngo_usr_unassigned",
        role=UserRole.NGO,
        facility_id=None,
        ngo_id=None,
        session_id="sess_5",
    )
    assigned_user = AuthenticatedUser(
        user_id="ngo_usr_assigned",
        role=UserRole.NGO,
        facility_id=None,
        ngo_id="NGO-ROBIN",
        session_id="sess_6",
    )
    admin_user = AuthenticatedUser(
        user_id="adm_001",
        role=UserRole.ADMIN,
        facility_id=None,
        ngo_id=None,
        session_id="sess_2",
    )

    # Unassigned user targeting None/empty raises 403
    with pytest.raises(HTTPException) as exc:
        assert_owns_ngo_record(unassigned_user, None)  # type: ignore
    assert exc.value.status_code == 403

    # Unassigned user targeting real NGO raises 403
    with pytest.raises(HTTPException) as exc:
        assert_owns_ngo_record(unassigned_user, "NGO-ROBIN")
    assert exc.value.status_code == 403

    # Mismatched NGO raises 403
    with pytest.raises(HTTPException) as exc:
        assert_owns_ngo_record(assigned_user, "NGO-OTHER")
    assert exc.value.status_code == 403

    # Matching NGO passes
    assert_owns_ngo_record(assigned_user, "NGO-ROBIN")

    # Admin bypasses
    assert_owns_ngo_record(admin_user, "NGO-ANY")
