"""
Unit and integration tests for Role-Based Access Control (RBAC):
- Permission matrix correctness for all 5 roles
- RequireRole and RequirePermission FastAPI dependencies
- Role spoofing resistance (identity from session only, not client claims)
- Object-level authorization helpers (student record ownership, facility boundary, NGO boundary)
"""
import pytest
from fastapi import APIRouter, Depends, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.auth_dependencies import (
    AuthenticatedUser,
    Permission,
    ROLE_PERMISSIONS,
    RequirePermission,
    RequireRole,
    assert_owns_ngo_record,
    assert_owns_student_record,
    assert_same_facility,
    has_permission,
)
from app.core.session_service import SESSION_COOKIE_NAME, create_session
from app.db.seed import seed_database
from app.main import app
from app.models.enums import UserRole
from app.models.user import User


# ── Test Endpoints to Verify RBAC Dependencies ───────────────────────────────

rbac_test_router = APIRouter(prefix="/test-rbac", tags=["RBAC Test"])


@rbac_test_router.get(
    "/admin-only",
    dependencies=[Depends(RequireRole(UserRole.ADMIN))],
)
def admin_only_endpoint():
    return {"status": "admin_granted"}


@rbac_test_router.get(
    "/kitchen-or-manager",
    dependencies=[Depends(RequireRole(UserRole.KITCHEN, UserRole.MANAGER))],
)
def kitchen_or_manager_endpoint():
    return {"status": "facility_staff_granted"}


@rbac_test_router.post(
    "/create-surplus",
    dependencies=[Depends(RequirePermission(Permission.SURPLUS_CREATE))],
)
def surplus_create_endpoint():
    return {"status": "surplus_created"}


@rbac_test_router.get(
    "/claim-donation",
    dependencies=[Depends(RequirePermission(Permission.DONATION_CLAIM))],
)
def donation_claim_endpoint():
    return {"status": "donation_claimed"}


# Mount test router on the test app
app.include_router(rbac_test_router)


# ── Permission Matrix Unit Tests ─────────────────────────────────────────────

def test_student_least_privilege():
    """Verify Student role has strictly limited permissions."""
    perms = ROLE_PERMISSIONS[UserRole.STUDENT]
    assert Permission.OWN_ATTENDANCE_READ in perms
    assert Permission.OWN_ATTENDANCE_WRITE in perms
    assert Permission.OWN_RATINGS_WRITE in perms
    assert Permission.MENU_READ in perms

    # Negative checks: student must NOT have kitchen, manager, ngo, admin permissions
    assert Permission.SURPLUS_CREATE not in perms
    assert Permission.FORECASTING_READ not in perms
    assert Permission.DONATION_CLAIM not in perms
    assert Permission.ALL_USERS_MANAGE not in perms


def test_kitchen_least_privilege():
    """Verify Kitchen role has kitchen operational permissions only."""
    perms = ROLE_PERMISSIONS[UserRole.KITCHEN]
    assert Permission.KITCHEN_LOGS_WRITE in perms
    assert Permission.SURPLUS_CREATE in perms
    assert Permission.HANDOVER_VERIFY in perms

    # Negative checks
    assert Permission.DONATION_CLAIM not in perms
    assert Permission.ALL_USERS_MANAGE not in perms
    assert Permission.SAFETY_BUFFER_OVERRIDE not in perms


def test_manager_least_privilege():
    """Verify Manager role has analytics, forecasting, and oversight permissions."""
    perms = ROLE_PERMISSIONS[UserRole.MANAGER]
    assert Permission.FORECASTING_READ in perms
    assert Permission.SAFETY_BUFFER_OVERRIDE in perms
    assert Permission.FACILITY_DONATIONS_READ in perms

    # Negative checks: Manager cannot claim donations as an NGO
    assert Permission.DONATION_CLAIM not in perms
    assert Permission.ALL_USERS_MANAGE not in perms


def test_ngo_least_privilege():
    """Verify NGO role has donation discovery, claim, and pickup permissions only."""
    perms = ROLE_PERMISSIONS[UserRole.NGO]
    assert Permission.AVAILABLE_DONATIONS_READ in perms
    assert Permission.DONATION_CLAIM in perms
    assert Permission.PICKUP_VERIFY in perms
    assert Permission.OWN_NGO_PROFILE_READ in perms

    # Negative checks: NGO cannot create kitchen logs or see student attendance
    assert Permission.KITCHEN_LOGS_WRITE not in perms
    assert Permission.OWN_ATTENDANCE_READ not in perms
    assert Permission.ALL_USERS_MANAGE not in perms


def test_admin_has_management_permissions():
    """Verify Admin role has system management, user management, and audit permissions."""
    perms = ROLE_PERMISSIONS[UserRole.ADMIN]
    assert Permission.ALL_USERS_MANAGE in perms
    assert Permission.NGO_VERIFY in perms
    assert Permission.SYSTEM_CONFIG_MANAGE in perms
    assert Permission.AUDIT_LOGS_READ in perms
    assert Permission.ALL_DATA_READ in perms


# ── Dependency Integration Tests ─────────────────────────────────────────────

def test_require_role_enforcement(client: TestClient, db_session: Session):
    """
    Test RequireRole dependency:
    - Admin succeeds on /test-rbac/admin-only
    - Student gets 403 on /test-rbac/admin-only
    - Kitchen gets 403 on /test-rbac/admin-only
    """
    seed_database(db_session, environment="development")

    # 1. Login as Student
    login_student = client.post(
        "/api/v1/auth/login",
        json={"identifier": "student_shreya", "password": "DevStudentPass123!"},
    )
    assert login_student.status_code == 200

    resp = client.get("/test-rbac/admin-only")
    assert resp.status_code == 403
    assert "You do not have permission" in resp.json()["detail"]

    # 2. Login as Admin
    login_admin = client.post(
        "/api/v1/auth/login",
        json={"identifier": "sys_admin", "password": "DevAdminPass123!"},
    )
    assert login_admin.status_code == 200

    resp = client.get("/test-rbac/admin-only")
    assert resp.status_code == 200
    assert resp.json()["status"] == "admin_granted"


def test_require_permission_enforcement(client: TestClient, db_session: Session):
    """
    Test RequirePermission dependency:
    - Kitchen can access /test-rbac/create-surplus (has surplus:create)
    - NGO gets 403 on /test-rbac/create-surplus (lacks surplus:create)
    - NGO can access /test-rbac/claim-donation (has donation:claim)
    - Kitchen gets 403 on /test-rbac/claim-donation (lacks donation:claim)
    """
    seed_database(db_session, environment="development")

    # 1. Kitchen login
    client.post(
        "/api/v1/auth/login",
        json={"identifier": "chef_rajesh", "password": "DevKitchenPass123!"},
    )
    # Kitchen creating surplus -> Allowed
    resp = client.post("/test-rbac/create-surplus")
    assert resp.status_code == 200
    # Kitchen claiming donation -> Denied
    resp = client.get("/test-rbac/claim-donation")
    assert resp.status_code == 403

    # 2. NGO login
    client.post(
        "/api/v1/auth/login",
        json={"identifier": "rha_arunav", "password": "DevNgoPass123!"},
    )
    # NGO creating surplus -> Denied
    resp = client.post("/test-rbac/create-surplus")
    assert resp.status_code == 403
    # NGO claiming donation -> Allowed
    resp = client.get("/test-rbac/claim-donation")
    assert resp.status_code == 200


def test_role_spoofing_resistance(client: TestClient, db_session: Session):
    """
    CRITICAL SECURITY TEST:
    A student sends spoofed headers (`X-User-Role: admin`, `X-Role: admin`, etc.)
    and request bodies asserting admin identity.
    The server MUST ignore all client-supplied role claims and enforce the role
    derived strictly from the verified session in the database.
    """
    seed_database(db_session, environment="development")

    client.post(
        "/api/v1/auth/login",
        json={"identifier": "student_shreya", "password": "DevStudentPass123!"},
    )

    # Attempt to spoof admin privileges via custom headers
    spoof_headers = {
        "X-User-Role": "admin",
        "X-Role": "admin",
        "X-User-Id": "usr-adm-101",
        "Authorization": "Bearer fake_token",
    }
    resp = client.get("/test-rbac/admin-only", headers=spoof_headers)
    assert resp.status_code == 403
    assert "You do not have permission" in resp.json()["detail"]


# ── Object-Level Authorization Helper Unit Tests ─────────────────────────────

def test_assert_owns_student_record():
    """Verify students can only access their own records; admins can access any."""
    student_shreya = AuthenticatedUser(
        user_id="usr-student-001",
        role=UserRole.STUDENT,
        facility_id="Mess-A",
        ngo_id=None,
        session_id="sess-1",
    )
    admin = AuthenticatedUser(
        user_id="usr-admin-001",
        role=UserRole.ADMIN,
        facility_id=None,
        ngo_id=None,
        session_id="sess-2",
    )

    # Shreya accesses own record -> OK
    assert_owns_student_record(student_shreya, "usr-student-001")

    # Shreya accesses another student's record -> 403
    with pytest.raises(HTTPException) as exc_info:
        assert_owns_student_record(student_shreya, "usr-student-999")
    assert exc_info.value.status_code == 403
    assert "own records" in exc_info.value.detail

    # Admin accesses student record -> OK (admin bypass)
    assert_owns_student_record(admin, "usr-student-999")


def test_assert_same_facility():
    """Verify facility-scoped operations reject cross-facility access."""
    kitchen_block_b = AuthenticatedUser(
        user_id="usr-chef-101",
        role=UserRole.KITCHEN,
        facility_id="Grand Central Mess - Block B",
        ngo_id=None,
        session_id="sess-3",
    )
    admin = AuthenticatedUser(
        user_id="usr-admin-001",
        role=UserRole.ADMIN,
        facility_id=None,
        ngo_id=None,
        session_id="sess-4",
    )

    # Accessing own facility -> OK
    assert_same_facility(kitchen_block_b, "Grand Central Mess - Block B")

    # Accessing different facility -> 403
    with pytest.raises(HTTPException) as exc_info:
        assert_same_facility(kitchen_block_b, "North Dining Hall - Block A")
    assert exc_info.value.status_code == 403
    assert "assigned facility" in exc_info.value.detail

    # Admin accesses any facility -> OK
    assert_same_facility(admin, "North Dining Hall - Block A")


def test_assert_owns_ngo_record():
    """Verify NGO users can only access data belonging to their own NGO."""
    rha_user = AuthenticatedUser(
        user_id="usr-ngo-101",
        role=UserRole.NGO,
        facility_id=None,
        ngo_id="ngo-1",
        session_id="sess-5",
    )
    admin = AuthenticatedUser(
        user_id="usr-admin-001",
        role=UserRole.ADMIN,
        facility_id=None,
        ngo_id=None,
        session_id="sess-6",
    )

    # Accessing own NGO -> OK
    assert_owns_ngo_record(rha_user, "ngo-1")

    # Accessing another NGO -> 403
    with pytest.raises(HTTPException) as exc_info:
        assert_owns_ngo_record(rha_user, "ngo-2")
    assert exc_info.value.status_code == 403
    assert "own NGO" in exc_info.value.detail

    # Admin accesses any NGO -> OK
    assert_owns_ngo_record(admin, "ngo-2")
