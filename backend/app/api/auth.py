"""
Authentication endpoints: Login, Logout, and Current User profile (/me).

Follows strict security standards:
- Opaque session token stored in HttpOnly, SameSite, Secure cookie.
- Server-side session verification via HMAC-SHA256 hash lookup in database.
- Generic login failure messages (no account enumeration).
- IP rate limiting and account lockout protection.
- CSRF protection on state-changing requests.
- No sensitive secrets or password hashes returned in responses.
"""
import logging
import secrets
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.auth_dependencies import (
    AuthenticatedUser,
    Permission,
    RequirePermission,
    RequireRole,
    ROLE_PERMISSIONS,
    assert_same_facility,
    get_current_session,
    get_current_user,
    require_csrf,
)
from app.core.config import get_settings
from app.core.database import get_db
from app.core.ip_resolver import get_client_ip
from app.core.pin_security import hash_pickup_pin, pin_tracker
from app.core.rate_limiter import RateLimiterUnavailableError, login_tracker
from app.core.security import verify_secret
from app.core.session_service import (
    SESSION_COOKIE_NAME,
    cleanup_expired_sessions,
    create_session,
    generate_csrf_token,
    invalidate_session,
)
from app.models.audit import AuditEvent
from app.models.donation import SurplusDonation
from app.models.enums import AuditSeverity, UserRole
from app.models.session import ServerSession
from app.models.user import User
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    PinRecoveryRequest,
    PinRecoveryResponse,
    SessionCleanupResponse,
)

logger = logging.getLogger("messaver.api.auth")

router = APIRouter(tags=["Authentication"])



@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate user and establish session",
)
def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    """
    Authenticates user credentials and issues a secure server-managed session.
    The session token is placed into an HttpOnly cookie.
    Returns the user profile, granted permissions, and a CSRF token.
    Generic error messages prevent account enumeration.
    """
    settings = get_settings()
    client_ip = get_client_ip(request)

    # 1. IP rate limiting & lockout checks (fails closed in production if shared backend is down)
    try:
        if login_tracker.is_ip_rate_limited(
            client_ip,
            settings.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
            settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
        ):
            logger.warning(f"Rate limit exceeded for IP {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later.",
            )

        # Record IP attempt
        login_tracker.record_ip_attempt(client_ip)

        # 2. Account lockout check
        if login_tracker.is_account_locked(req.identifier):
            remaining = login_tracker.get_lockout_remaining(req.identifier)
            logger.warning(
                f"Login attempted on temporarily locked account '{req.identifier}'"
            )
            # Generic message avoids confirming whether the account exists
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
            )
    except RateLimiterUnavailableError as e:
        logger.error(f"Rate limiting backend unavailable: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication rate limiting service temporarily unavailable. Please retry shortly.",
        )

    # 3. User lookup by username or email
    user = (
        db.query(User)
        .filter(
            (User.username == req.identifier) | (User.email == req.identifier)
        )
        .first()
    )

    # 4. Credential verification (generic message on any failure)
    generic_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password.",
    )

    def _record_failure() -> None:
        try:
            login_tracker.record_account_failure(
                req.identifier,
                settings.ACCOUNT_LOCKOUT_THRESHOLD,
                settings.ACCOUNT_LOCKOUT_DURATION_SECONDS,
            )
        except RateLimiterUnavailableError:
            pass

    if user is None:
        _record_failure()
        raise generic_error

    if not user.is_active:
        _record_failure()
        raise generic_error

    if not verify_secret(req.password, user.password_hash):
        _record_failure()
        raise generic_error

    # 5. Success: clear lockout failures
    try:
        login_tracker.clear_account_failures(req.identifier)
        login_tracker.clear_account_failures(user.username)
        login_tracker.clear_account_failures(user.email)
    except RateLimiterUnavailableError:
        pass

    # 6. Create server-side session
    token, session_record = create_session(
        db=db,
        user=user,
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent"),
    )

    # 7. Generate session-bound CSRF token
    csrf_token = generate_csrf_token(session_record.id, settings.CSRF_SECRET)

    # 8. Set secure HttpOnly cookie
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.SESSION_MAX_AGE_SECONDS,
        httponly=True,
        secure=settings.get_cookie_secure(),
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )

    # 9. Derive permissions from server-side role
    role_enum = UserRole(user.role.value if hasattr(user.role, "value") else str(user.role))
    permissions = sorted(list(ROLE_PERMISSIONS.get(role_enum, set())))

    user_response = CurrentUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=role_enum,
        facility_id=user.facility_id,
        ngo_id=user.ngo_id,
        permissions=permissions,
        csrf_token=csrf_token,
    )

    logger.info(f"User {user.username} ({user.role}) successfully authenticated")
    return LoginResponse(
        message="Login successful",
        user=user_response,
    )


@router.post(
    "/logout",
    response_model=LogoutResponse,
    status_code=status.HTTP_200_OK,
    summary="Terminate session and clear cookie",
    dependencies=[Depends(require_csrf)],
)
def logout(
    response: Response,
    session: ServerSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> LogoutResponse:
    """
    Terminates the server-side session and clears the session cookie.
    Requires CSRF token validation to protect against forced-logout CSRF.
    """
    settings = get_settings()

    invalidate_session(db, session.id)

    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        domain=settings.COOKIE_DOMAIN,
        httponly=True,
        secure=settings.get_cookie_secure(),
        samesite=settings.COOKIE_SAMESITE,
    )

    logger.info(f"Session {session.id} terminated cleanly")
    return LogoutResponse(message="Logged out successfully")


@router.get(
    "/me",
    response_model=CurrentUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated user profile and permissions",
)
def get_current_user_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
    session: ServerSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> CurrentUserResponse:
    """
    Returns current authenticated user profile and active permissions.
    Identity and role are derived strictly from the server session.
    Also returns an active CSRF token for subsequent state-changing requests.
    """
    settings = get_settings()

    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or no longer exists.",
        )

    csrf_token = generate_csrf_token(session.id, settings.CSRF_SECRET)
    permissions = sorted(list(ROLE_PERMISSIONS.get(current_user.role, set())))

    return CurrentUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=current_user.role,
        facility_id=user.facility_id,
        ngo_id=user.ngo_id,
        permissions=permissions,
        csrf_token=csrf_token,
    )


@router.post(
    "/donations/{donation_id}/reset-pin-lockout",
    response_model=PinRecoveryResponse,
    status_code=status.HTTP_200_OK,
    summary="Authorized staff reset or rotation of locked donation PIN",
    dependencies=[Depends(require_csrf)],
)
def reset_donation_pin_lockout(
    donation_id: str,
    req: PinRecoveryRequest,
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.DONATION_PIN_RESET)),
    db: Session = Depends(get_db),
) -> PinRecoveryResponse:
    """
    Authorized staff recovery for locked pickup PINs.
    Requires DONATION_PIN_RESET permission (Manager or Admin).
    Managers can only reset lockouts for donations at their assigned facility.
    Generates an immutable audit event without logging secrets or PINs.
    """
    donation = db.query(SurplusDonation).filter(SurplusDonation.id == donation_id).first()
    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Donation '{donation_id}' not found.",
        )

    # Object-level check: Manager cannot reset donation outside their facility
    assert_same_facility(current_user, donation.kitchen_facility)

    # Reset attempt tracker
    pin_tracker.reset(donation_id)

    # Rotate PIN if requested
    new_pin: Optional[str] = None
    if req.rotate_pin:
        new_pin = f"{secrets.randbelow(10000):04d}"
        donation.pickup_pin_hash = hash_pickup_pin(new_pin, donation_id)

    # Audit logging without leaking PINs or sensitive data
    actor_user = db.query(User).filter(User.id == current_user.user_id).first()
    actor_name = actor_user.username if actor_user else current_user.user_id

    audit_event = AuditEvent(
        id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        timestamp=datetime.now(timezone.utc).isoformat(),
        actor_name=actor_name,
        actor_role=current_user.role,
        action="DONATION_PIN_RECOVERY",
        details=(
            f"Reset PIN lockout for donation '{donation_id}'. "
            f"Rotated: {req.rotate_pin}. Reason: {req.reason.strip()}"
        ),
        severity=AuditSeverity.WARNING,
    )
    db.add(audit_event)
    db.commit()

    logger.warning(
        f"PIN lockout reset for donation {donation_id} by {actor_name} ({current_user.role}). "
        f"Rotated: {req.rotate_pin}"
    )

    return PinRecoveryResponse(
        message="Donation pickup PIN lockout reset successfully.",
        donation_id=donation_id,
        new_pin=new_pin,
        unlocked=True,
    )


@router.post(
    "/cleanup-sessions",
    response_model=SessionCleanupResponse,
    status_code=status.HTTP_200_OK,
    summary="Trigger scheduled cleanup of expired or inactive sessions",
    dependencies=[Depends(require_csrf)],
)
def cleanup_sessions(
    current_user: AuthenticatedUser = Depends(RequireRole(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> SessionCleanupResponse:
    """
    Administrative maintenance endpoint to deactivate expired or inactive session records.
    Idempotent and bounded: does not delete records or deactivate valid active sessions.
    Requires ADMIN role.
    """
    count = cleanup_expired_sessions(db)
    return SessionCleanupResponse(
        message=f"Cleaned up {count} expired or inactive sessions.",
        deactivated_sessions_count=count,
    )

