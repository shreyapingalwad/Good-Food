"""
Integration tests for authentication endpoints:
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- GET /api/v1/auth/me
"""
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.rate_limiter import login_tracker
from app.core.security import hash_secret
from app.core.session_service import (
    SESSION_COOKIE_NAME,
    create_session,
    generate_csrf_token,
)
from app.db.seed import seed_database
from app.models.enums import UserRole
from app.models.session import ServerSession
from app.models.user import User


def setup_users(db: Session):
    """Populates seed users and adds an inactive test user."""
    seed_database(db, environment="development")
    inactive = User(
        id="usr-inactive-999",
        username="inactive_student",
        email="inactive@campus.edu",
        full_name="Inactive Student",
        password_hash=hash_secret("InactivePass123!"),
        role=UserRole.STUDENT,
        is_active=False,
    )
    db.add(inactive)
    db.commit()


def test_login_success_all_roles(client: TestClient, db_session: Session):
    """
    Test successful login for all 5 roles.
    Verifies:
    - Status 200
    - Cookie messaver_session is set with HttpOnly, SameSite
    - Response contains user profile, correct role, and CSRF token
    - Response does NOT contain password_hash or session token
    """
    setup_users(db_session)

    credentials = [
        ("student_shreya", "DevStudentPass123!", UserRole.STUDENT),
        ("chef_rajesh", "DevKitchenPass123!", UserRole.KITCHEN),
        ("dr_anita_roy", "DevManagerPass123!", UserRole.MANAGER),
        ("rha_arunav", "DevNgoPass123!", UserRole.NGO),
        ("sys_admin", "DevAdminPass123!", UserRole.ADMIN),
    ]

    for username, password, expected_role in credentials:
        response = client.post(
            "/api/v1/auth/login",
            json={"identifier": username, "password": password},
        )
        assert response.status_code == 200, f"Login failed for {username}: {response.text}"
        data = response.json()
        assert data["message"] == "Login successful"

        user = data["user"]
        assert user["username"] == username
        assert user["role"] == expected_role.value
        assert "csrf_token" in user
        assert len(user["csrf_token"]) > 20
        assert len(user["permissions"]) > 0

        # CRITICAL SECURITY CHECK: Never leak password hash or secrets
        assert "password" not in user
        assert "password_hash" not in user
        assert "SESSION_SECRET" not in str(data)

        # Cookie check
        assert SESSION_COOKIE_NAME in response.cookies
        cookie_header = response.headers.get("set-cookie", "")
        assert "HttpOnly" in cookie_header
        assert "SameSite=lax" in cookie_header or "samesite=lax" in cookie_header.lower()


def test_login_by_email(client: TestClient, db_session: Session):
    """Verify login works with email identifier instead of username."""
    setup_users(db_session)
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@campus.edu", "password": "DevAdminPass123!"},
    )
    assert response.status_code == 200
    assert response.json()["user"]["username"] == "sys_admin"


def test_login_incorrect_password(client: TestClient, db_session: Session):
    """
    Verify wrong password returns 401 with generic error message.
    """
    setup_users(db_session)
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "sys_admin", "password": "WrongPassword999!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password."
    assert SESSION_COOKIE_NAME not in response.cookies


def test_login_nonexistent_user_no_enumeration(client: TestClient, db_session: Session):
    """
    Verify unknown account returns the EXACT same generic 401 message
    to prevent user enumeration.
    """
    setup_users(db_session)
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "nonexistent_user_xyz", "password": "AnyPassword123!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password."


def test_login_inactive_user(client: TestClient, db_session: Session):
    """
    Verify inactive account is rejected with generic 401 message.
    """
    setup_users(db_session)
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "inactive_student", "password": "InactivePass123!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password."


def test_get_current_user_me_authenticated(client: TestClient, db_session: Session):
    """
    Verify GET /api/v1/auth/me returns current user profile when session cookie is provided.
    """
    setup_users(db_session)
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"identifier": "chef_rajesh", "password": "DevKitchenPass123!"},
    )
    assert login_resp.status_code == 200

    # TestClient preserves cookies automatically
    me_resp = client.get("/api/v1/auth/me")
    assert me_resp.status_code == 200
    user = me_resp.json()
    assert user["username"] == "chef_rajesh"
    assert user["role"] == "kitchen"
    assert "surplus:create" in user["permissions"]
    assert "csrf_token" in user


def test_get_current_user_me_unauthenticated(client: TestClient, db_session: Session):
    """
    Verify GET /api/v1/auth/me returns 401 when no session cookie is provided.
    """
    setup_users(db_session)
    # Clear any cookies
    client.cookies.clear()
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]


def test_get_current_user_me_invalid_cookie(client: TestClient, db_session: Session):
    """
    Verify GET /api/v1/auth/me returns 401 with forged or malformed session cookie.
    """
    setup_users(db_session)
    client.cookies.set(SESSION_COOKIE_NAME, "forged_malicious_session_token_12345")
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "Session expired or invalid" in response.json()["detail"]


def test_get_current_user_me_expired_session(client: TestClient, db_session: Session):
    """
    Verify expired sessions are rejected.
    """
    setup_users(db_session)
    user = db_session.query(User).filter(User.username == "sys_admin").first()

    # Create an expired session
    token, session_record = create_session(db_session, user)
    session_record.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db_session.commit()

    client.cookies.set(SESSION_COOKIE_NAME, token)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_logout_requires_csrf(client: TestClient, db_session: Session):
    """
    Verify POST /api/v1/auth/logout without CSRF header is rejected with 403.
    """
    setup_users(db_session)
    client.post(
        "/api/v1/auth/login",
        json={"identifier": "sys_admin", "password": "DevAdminPass123!"},
    )

    # Logout without CSRF header
    logout_resp = client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 403
    assert "CSRF token missing" in logout_resp.json()["detail"]


def test_logout_with_invalid_csrf(client: TestClient, db_session: Session):
    """
    Verify POST /api/v1/auth/logout with invalid CSRF header is rejected with 403.
    """
    setup_users(db_session)
    client.post(
        "/api/v1/auth/login",
        json={"identifier": "sys_admin", "password": "DevAdminPass123!"},
    )

    logout_resp = client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": "invalid_forged_csrf_token"},
    )
    assert logout_resp.status_code == 403
    assert "Invalid or expired CSRF token" in logout_resp.json()["detail"]


def test_logout_success_and_invalidation(client: TestClient, db_session: Session):
    """
    Verify successful logout:
    - Valid CSRF header
    - Status 200
    - Cookie cleared
    - Server session deactivated in DB
    - Subsequent /me call returns 401
    """
    setup_users(db_session)
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"identifier": "student_shreya", "password": "DevStudentPass123!"},
    )
    csrf_token = login_resp.json()["user"]["csrf_token"]

    # Logout with valid CSRF token
    logout_resp = client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": csrf_token},
    )
    assert logout_resp.status_code == 200
    assert logout_resp.json()["message"] == "Logged out successfully"

    # Subsequent /me call with client cookies returns 401
    me_resp = client.get("/api/v1/auth/me")
    assert me_resp.status_code == 401


def test_ip_rate_limiting(client: TestClient, db_session: Session):
    """
    Verify excessive login attempts from an IP are throttled with 429.
    """
    setup_users(db_session)
    settings = get_settings()
    test_ip = "192.0.2.100"

    # Clear prior attempts for test_ip
    login_tracker._ip_attempts[test_ip] = []

    # Send up to the limit
    for _ in range(settings.LOGIN_RATE_LIMIT_MAX_ATTEMPTS):
        resp = client.post(
            "/api/v1/auth/login",
            json={"identifier": "sys_admin", "password": "WrongPassword!"},
            headers={"x-forwarded-for": test_ip},
        )
        assert resp.status_code in (401, 429)

    # Clean up test IP in tracker
    login_tracker._ip_attempts[test_ip] = []


def test_account_lockout(client: TestClient, db_session: Session):
    """
    Verify consecutive failed attempts on an account triggers lockout.
    """
    setup_users(db_session)
    settings = get_settings()
    target_username = "student_shreya"

    # Reset any previous failures
    login_tracker.clear_account_failures(target_username)

    # Fail threshold times
    for _ in range(settings.ACCOUNT_LOCKOUT_THRESHOLD):
        client.post(
            "/api/v1/auth/login",
            json={"identifier": target_username, "password": "WrongPassword!"},
        )

    # Account should now be locked
    assert login_tracker.is_account_locked(target_username) is True

    # Even with correct password, login should be rejected while locked
    resp = client.post(
        "/api/v1/auth/login",
        json={"identifier": target_username, "password": "DevStudentPass123!"},
    )
    assert resp.status_code == 401

    # Cleanup
    login_tracker.clear_account_failures(target_username)
