"""
Server-side session management service.

Sessions are server-managed. The client receives only an opaque session token
in an HttpOnly cookie. The server stores an HMAC-SHA256 hash of that token,
so a database leak cannot directly hijack sessions.
"""
import hashlib
import hmac
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.session import ServerSession
from app.models.user import User

logger = logging.getLogger("messaver.sessions")

SESSION_COOKIE_NAME = "messaver_session"
CSRF_COOKIE_NAME = "messaver_csrf"
CSRF_HEADER_NAME = "x-csrf-token"


def _hash_token(token: str, secret: str) -> str:
    """
    Produces an HMAC-SHA256 hash of the session token using the server secret.
    This ensures that even if the database is leaked, session tokens cannot be
    recovered or forged without the secret.
    """
    return hmac.new(
        secret.encode("utf-8"),
        token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def generate_csrf_token(session_id: str, csrf_secret: str) -> str:
    """
    Generates a CSRF token tied to a specific session.
    Uses HMAC-SHA256(csrf_secret, session_id + random_nonce).
    """
    nonce = secrets.token_urlsafe(16)
    signature = hmac.new(
        csrf_secret.encode("utf-8"),
        f"{session_id}:{nonce}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{nonce}.{signature}"


def verify_csrf_token(token: str, session_id: str, csrf_secret: str) -> bool:
    """
    Verifies a CSRF token against the session. Uses constant-time comparison.
    """
    try:
        parts = token.split(".", 1)
        if len(parts) != 2:
            return False
        nonce, signature = parts
        expected = hmac.new(
            csrf_secret.encode("utf-8"),
            f"{session_id}:{nonce}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(signature, expected)
    except Exception:
        return False


def create_session(
    db: Session,
    user: User,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> tuple[str, ServerSession]:
    """
    Creates a new server-side session for an authenticated user.
    Returns (plaintext_token, session_record).
    The plaintext token is placed in the cookie; only its HMAC hash is stored.
    """
    settings = get_settings()

    session_id = str(uuid.uuid4())
    token = secrets.token_urlsafe(48)
    token_hash = _hash_token(token, settings.SESSION_SECRET)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=settings.SESSION_MAX_AGE_SECONDS)

    # Truncate user agent to prevent oversized storage
    truncated_ua = (user_agent or "")[:512] if user_agent else None

    session_record = ServerSession(
        id=session_id,
        token_hash=token_hash,
        user_id=user.id,
        user_role=user.role.value if hasattr(user.role, "value") else str(user.role),
        user_facility_id=user.facility_id,
        user_ngo_id=user.ngo_id,
        ip_address=ip_address,
        user_agent=truncated_ua,
        is_active=True,
        expires_at=expires_at,
        last_activity_at=now,
    )
    db.add(session_record)
    db.commit()
    db.refresh(session_record)

    return token, session_record


def validate_session(
    db: Session, token: str, now: Optional[datetime] = None
) -> Optional[ServerSession]:
    """
    Validates a session token by looking up its HMAC hash in the database.
    Enforces dual timeouts:
    1. Absolute expiration: session_record.expires_at > current_time
    2. Idle inactivity timeout: now - last_activity_at <= SESSION_IDLE_TIMEOUT_SECONDS
    Returns the session if valid; None otherwise.
    """
    settings = get_settings()
    token_hash = _hash_token(token, settings.SESSION_SECRET)

    current_time = now or datetime.now(timezone.utc)
    session_record = (
        db.query(ServerSession)
        .filter(
            ServerSession.token_hash == token_hash,
            ServerSession.is_active == True,
        )
        .first()
    )

    if session_record is None:
        return None

    # Check absolute expiration
    exp_at = session_record.expires_at
    if exp_at.tzinfo is None:
        exp_at = exp_at.replace(tzinfo=timezone.utc)

    if exp_at <= current_time:
        logger.info(
            f"Session {session_record.id} expired due to absolute lifetime "
            f"(expires_at: {exp_at}, current: {current_time})"
        )
        session_record.is_active = False
        db.commit()
        return None

    # Check idle timeout against last_activity_at
    last_active = session_record.last_activity_at
    if last_active.tzinfo is None:
        last_active = last_active.replace(tzinfo=timezone.utc)

    idle_threshold = current_time - timedelta(seconds=settings.SESSION_IDLE_TIMEOUT_SECONDS)
    if last_active < idle_threshold:
        logger.info(
            f"Session {session_record.id} expired due to idle inactivity "
            f"(last active: {last_active}, threshold: {idle_threshold})"
        )
        session_record.is_active = False
        db.commit()
        return None

    # Update last activity timestamp (sliding window renewal)
    session_record.last_activity_at = current_time
    db.commit()

    return session_record


def invalidate_session(db: Session, session_id: str) -> bool:
    """
    Marks a session as inactive (logout). Does not delete for audit purposes.
    """
    session_record = (
        db.query(ServerSession)
        .filter(ServerSession.id == session_id)
        .first()
    )
    if session_record:
        session_record.is_active = False
        db.commit()
        return True
    return False


def invalidate_all_user_sessions(db: Session, user_id: str) -> int:
    """
    Invalidates all active sessions for a user (e.g., on password change or lockout).
    Returns the count of sessions invalidated.
    """
    count = (
        db.query(ServerSession)
        .filter(
            ServerSession.user_id == user_id,
            ServerSession.is_active == True,
        )
        .update({"is_active": False})
    )
    db.commit()
    return count


def cleanup_expired_sessions(db: Session, max_rows: int = 1000) -> int:
    """
    Marks expired sessions as inactive (bounded and idempotent).
    Evaluates both absolute expiration and idle inactivity.
    """
    now = datetime.now(timezone.utc)
    settings = get_settings()
    idle_threshold = now - timedelta(seconds=settings.SESSION_IDLE_TIMEOUT_SECONDS)

    expired_sessions = (
        db.query(ServerSession)
        .filter(
            ServerSession.is_active == True,
            (ServerSession.expires_at <= now)
            | (ServerSession.last_activity_at <= idle_threshold),
        )
        .limit(max_rows)
        .all()
    )
    count = 0
    for sess in expired_sessions:
        sess.is_active = False
        count += 1

    if count > 0:
        db.commit()
    logger.info(f"Cleaned up {count} expired/idle sessions")
    return count
