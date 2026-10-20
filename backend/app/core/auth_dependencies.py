"""
Authentication and Role-Based Access Control (RBAC) dependencies.

Provides reusable FastAPI dependencies for:
- Session-based authentication (cookie extraction + server-side validation)
- CSRF verification for state-changing requests
- Role-based authorization with explicit permission matrix
- Object-level authorization helpers for future domain endpoints

Identity, role, facility_id, and ngo_id are ALWAYS derived from the
server-side session, NEVER from client-supplied headers or request bodies.
"""
import logging
from dataclasses import dataclass
from typing import Optional

from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.session_service import (
    CSRF_HEADER_NAME,
    SESSION_COOKIE_NAME,
    validate_session,
    verify_csrf_token,
)
from app.models.enums import UserRole
from app.models.session import ServerSession

logger = logging.getLogger("messaver.auth")


# ── Authenticated User Context ───────────────────────────────────────────────

@dataclass(frozen=True)
class AuthenticatedUser:
    """
    Immutable representation of the authenticated user derived from
    a validated server-side session. This is the ONLY source of truth
    for identity, role, and scope in every endpoint.
    """
    user_id: str
    role: UserRole
    facility_id: Optional[str]
    ngo_id: Optional[str]
    session_id: str

    @property
    def is_student(self) -> bool:
        return self.role == UserRole.STUDENT

    @property
    def is_kitchen(self) -> bool:
        return self.role == UserRole.KITCHEN

    @property
    def is_manager(self) -> bool:
        return self.role == UserRole.MANAGER

    @property
    def is_ngo(self) -> bool:
        return self.role == UserRole.NGO

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN


# ── Permission Matrix ────────────────────────────────────────────────────────

class Permission:
    """
    Centralized permission constants for the role-permission matrix.
    Each permission maps to a specific operational capability.
    """
    # Student permissions
    OWN_ATTENDANCE_READ = "own_attendance:read"
    OWN_ATTENDANCE_WRITE = "own_attendance:write"
    OWN_RATINGS_WRITE = "own_ratings:write"
    MENU_READ = "menu:read"

    # Kitchen permissions
    KITCHEN_LOGS_READ = "kitchen_logs:read"
    KITCHEN_LOGS_WRITE = "kitchen_logs:write"
    SURPLUS_CREATE = "surplus:create"
    SURPLUS_OWN_FACILITY_READ = "surplus:own_facility_read"
    HANDOVER_VERIFY = "handover:verify"

    # Manager permissions
    FORECASTING_READ = "forecasting:read"
    SAFETY_BUFFER_OVERRIDE = "safety_buffer:override"
    FACILITY_ATTENDANCE_READ = "facility_attendance:read"
    FACILITY_LOGS_READ = "facility_logs:read"
    FACILITY_DONATIONS_READ = "facility_donations:read"
    DONATION_PIN_RESET = "donation_pin:reset"

    # NGO permissions
    AVAILABLE_DONATIONS_READ = "available_donations:read"
    DONATION_CLAIM = "donation:claim"
    PICKUP_VERIFY = "pickup:verify"
    OWN_NGO_PROFILE_READ = "own_ngo_profile:read"

    # Admin permissions
    ALL_USERS_MANAGE = "users:manage"
    NGO_VERIFY = "ngo:verify"
    SYSTEM_CONFIG_MANAGE = "system_config:manage"
    AUDIT_LOGS_READ = "audit_logs:read"
    ALL_DATA_READ = "all_data:read"


# The definitive role → permissions mapping.
# Principle: least privilege. Each role gets only what it needs.
ROLE_PERMISSIONS: dict[UserRole, set[str]] = {
    UserRole.STUDENT: {
        Permission.OWN_ATTENDANCE_READ,
        Permission.OWN_ATTENDANCE_WRITE,
        Permission.OWN_RATINGS_WRITE,
        Permission.MENU_READ,
    },
    UserRole.KITCHEN: {
        Permission.KITCHEN_LOGS_READ,
        Permission.KITCHEN_LOGS_WRITE,
        Permission.SURPLUS_CREATE,
        Permission.SURPLUS_OWN_FACILITY_READ,
        Permission.HANDOVER_VERIFY,
        Permission.MENU_READ,
    },
    UserRole.MANAGER: {
        Permission.FORECASTING_READ,
        Permission.SAFETY_BUFFER_OVERRIDE,
        Permission.FACILITY_ATTENDANCE_READ,
        Permission.FACILITY_LOGS_READ,
        Permission.FACILITY_DONATIONS_READ,
        Permission.MENU_READ,
        Permission.KITCHEN_LOGS_READ,
        Permission.DONATION_PIN_RESET,
    },
    UserRole.NGO: {
        Permission.AVAILABLE_DONATIONS_READ,
        Permission.DONATION_CLAIM,
        Permission.PICKUP_VERIFY,
        Permission.OWN_NGO_PROFILE_READ,
    },
    UserRole.ADMIN: {
        Permission.ALL_USERS_MANAGE,
        Permission.NGO_VERIFY,
        Permission.SYSTEM_CONFIG_MANAGE,
        Permission.AUDIT_LOGS_READ,
        Permission.ALL_DATA_READ,
        Permission.MENU_READ,
        Permission.KITCHEN_LOGS_READ,
        Permission.FACILITY_ATTENDANCE_READ,
        Permission.FACILITY_LOGS_READ,
        Permission.FACILITY_DONATIONS_READ,
        Permission.FORECASTING_READ,
        Permission.AVAILABLE_DONATIONS_READ,
        Permission.DONATION_PIN_RESET,
    },
}


def has_permission(role: UserRole, permission: str) -> bool:
    """Check if a role has a specific permission."""
    perms = ROLE_PERMISSIONS.get(role, set())
    return permission in perms


# ── FastAPI Dependencies ──────────────────────────────────────────────────────

def get_current_session(
    request: Request,
    db: Session = Depends(get_db),
) -> ServerSession:
    """
    Extracts and validates the session token from the HttpOnly cookie.
    Returns 401 if the session is missing, invalid, or expired.
    Never trusts client-supplied identity claims.
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
        )

    session = validate_session(db, token)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again.",
        )

    return session


def get_current_user(
    session: ServerSession = Depends(get_current_session),
) -> AuthenticatedUser:
    """
    Converts a validated session into an AuthenticatedUser context.
    All identity fields come from the server-side session, not the client.
    """
    try:
        role = UserRole(session.user_role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid role assignment. Contact administrator.",
        )

    return AuthenticatedUser(
        user_id=session.user_id,
        role=role,
        facility_id=session.user_facility_id,
        ngo_id=session.user_ngo_id,
        session_id=session.id,
    )


def require_csrf(
    request: Request,
    session: ServerSession = Depends(get_current_session),
) -> None:
    """
    Verifies the CSRF token for state-changing (non-safe) HTTP methods.
    Safe methods (GET, HEAD, OPTIONS) skip CSRF verification.
    The CSRF token is passed via the X-CSRF-Token header and verified
    against the session and server-side CSRF secret.
    """
    safe_methods = {"GET", "HEAD", "OPTIONS"}
    if request.method.upper() in safe_methods:
        return

    settings = get_settings()
    csrf_token = request.headers.get(CSRF_HEADER_NAME)

    if not csrf_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing. Include the X-CSRF-Token header.",
        )

    if not verify_csrf_token(csrf_token, session.id, settings.CSRF_SECRET):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired CSRF token.",
        )


class RequireRole:
    """
    Dependency that checks if the authenticated user has one of the required roles.
    Returns 403 if the user's role is not in the allowed set.

    Usage:
        @router.get("/admin/users", dependencies=[Depends(RequireRole(UserRole.ADMIN))])
    """
    def __init__(self, *allowed_roles: UserRole):
        self.allowed_roles = set(allowed_roles)

    def __call__(
        self,
        user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource.",
            )
        return user


class RequirePermission:
    """
    Dependency that checks if the authenticated user's role includes a specific permission.
    Returns 403 if the permission is not granted to the user's role.

    Usage:
        @router.post("/kitchen/logs", dependencies=[Depends(RequirePermission(Permission.KITCHEN_LOGS_WRITE))])
    """
    def __init__(self, permission: str):
        self.permission = permission

    def __call__(
        self,
        user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if not has_permission(user.role, self.permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return user


# ── Object-Level Authorization Helpers ────────────────────────────────────────
# These will be used in Phase 3+ domain endpoints to restrict access to
# specific records based on ownership, facility, or NGO assignment.

def assert_owns_student_record(user: AuthenticatedUser, student_id: str) -> None:
    """
    Asserts that the current user is the owner of a student record.
    Students can only access their own attendance/ratings.
    Admins bypass this check.
    """
    if user.is_admin:
        return
    if not student_id or not isinstance(student_id, str) or not student_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing student identifier.",
        )
    if not user.user_id or not user.user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User identity is not assigned.",
        )
    if user.user_id != student_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own records.",
        )


def assert_same_facility(user: AuthenticatedUser, facility_id: str) -> None:
    """
    Asserts that the user belongs to the same facility.
    Kitchen staff and managers can only access data from their own facility.
    Unassigned users cannot match unassigned records (None == None rejected).
    Admins bypass this check.
    """
    if user.is_admin:
        return
    if not facility_id or not isinstance(facility_id, str) or not facility_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing facility identifier.",
        )
    if not user.facility_id or not user.facility_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no assigned facility.",
        )
    if user.facility_id != facility_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access data from your assigned facility.",
        )


def assert_owns_ngo_record(user: AuthenticatedUser, ngo_id: str) -> None:
    """
    Asserts that the NGO user is associated with the specific NGO partner.
    Unassigned users cannot match unassigned records (None == None rejected).
    Admins bypass this check.
    """
    if user.is_admin:
        return
    if not ngo_id or not isinstance(ngo_id, str) or not ngo_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing NGO identifier.",
        )
    if not user.ngo_id or not user.ngo_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no assigned NGO.",
        )
    if user.ngo_id != ngo_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own NGO's records.",
        )
