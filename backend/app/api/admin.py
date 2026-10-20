"""
FastAPI endpoints for System Administrators:
- NGO partner administration (listing, verification, activation/deactivation controls)
- System configuration governance with explicit allowlist and secret protection
- Global tamper-evident audit history inspection with search and filtering
"""
from datetime import datetime, timezone
import logging
from typing import Any, List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.auth_dependencies import (
    AuthenticatedUser,
    Permission,
    RequirePermission,
    get_current_user,
    require_csrf,
)
from app.core.database import get_db
from app.core.session_service import invalidate_all_user_sessions
from app.models.audit import AuditEvent
from app.models.enums import AuditSeverity, UserRole
from app.models.ngo import NgoPartner
from app.models.system_config import SystemConfig
from app.models.user import User
from app.schemas.audit import AuditEventRead, AuditLogListResponse
from app.schemas.ngo import (
    NgoActivateRequest,
    NgoListResponse,
    NgoPartnerRead,
    NgoVerifyRequest,
)
from app.schemas.system_config import (
    SystemConfigListResponse,
    SystemConfigRead,
    SystemConfigUpdateRequest,
)

logger = logging.getLogger("messaver.admin")

router = APIRouter(tags=["Admin Governance"])

# ── Explicit System Configuration Allowlist ──────────────────────────────────
# Prevents arbitrary key injection and strictly separates editable operational
# parameters from production infrastructure secrets.
ALLOWED_CONFIG_KEYS = {
    "messaver_safety_buffer": "Operational safety buffer percentage over predicted headcount",
    "messaver_meal_cutoffs": "Student attendance opt-in/opt-out cutoff deadlines",
    "messaver_food_safety_rules": "Campus food-safety parameters (min holding temp, holding window, student cutoff hours)",
}

FORBIDDEN_SECRET_SUBSTRINGS = (
    "secret",
    "password",
    "pepper",
    "database_url",
    "token",
    "cookie",
    "jwt",
    "private_key",
)


def _require_admin_role(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Strictly enforces Administrator role for global governance endpoints."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrator privileges are required for this operation.",
        )
    return current_user


# ── 1. NGO Partner Administration ─────────────────────────────────────────────

@router.get(
    "/ngos",
    response_model=NgoListResponse,
    status_code=status.HTTP_200_OK,
    summary="List NGO redistribution partners with filters and pagination",
)
def list_ngo_partners(
    verified: Optional[bool] = Query(None, description="Filter by verification credential"),
    is_active: Optional[bool] = Query(None, description="Filter by operational active status"),
    search: Optional[str] = Query(None, description="Search by name or registration number"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: AuthenticatedUser = Depends(_require_admin_role),
    db: Session = Depends(get_db),
) -> NgoListResponse:
    """
    Returns registered NGO partners for administrative audit and lifecycle governance:
    - Admin-only access.
    - Filterable by verification, active status, or search query.
    """
    query = db.query(NgoPartner)

    if verified is not None:
        query = query.filter(NgoPartner.verified == verified)

    if is_active is not None:
        query = query.filter(NgoPartner.is_active == is_active)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                NgoPartner.name.ilike(term),
                NgoPartner.registration_number.ilike(term),
                NgoPartner.contact_person.ilike(term),
            )
        )

    total = query.count()
    items = query.order_by(NgoPartner.created_at.desc()).offset(offset).limit(limit).all()

    return NgoListResponse(
        items=[NgoPartnerRead.model_validate(it) for it in items],
        total=total,
    )


@router.get(
    "/ngos/{ngo_id}",
    response_model=NgoPartnerRead,
    status_code=status.HTTP_200_OK,
    summary="Inspect individual NGO partner details and compliance credentials",
)
def get_ngo_partner(
    ngo_id: str,
    current_user: AuthenticatedUser = Depends(_require_admin_role),
    db: Session = Depends(get_db),
) -> NgoPartnerRead:
    """
    Returns full NGO partner compliance profile.
    Admin-only access.
    """
    ngo = db.query(NgoPartner).filter(NgoPartner.id == ngo_id).first()
    if not ngo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"NGO partner '{ngo_id}' not found.",
        )
    return NgoPartnerRead.model_validate(ngo)


@router.patch(
    "/ngos/{ngo_id}/verify",
    response_model=NgoPartnerRead,
    status_code=status.HTTP_200_OK,
    summary="Grant or revoke NGO verification credential",
    dependencies=[Depends(require_csrf)],
)
@router.post(
    "/ngos/{ngo_id}/verify",
    response_model=NgoPartnerRead,
    status_code=status.HTTP_200_OK,
    summary="Grant or revoke NGO verification credential (POST alias)",
    dependencies=[Depends(require_csrf)],
)
def verify_ngo_partner(
    ngo_id: str,
    req: NgoVerifyRequest,
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.NGO_VERIFY)),
    db: Session = Depends(get_db),
) -> NgoPartnerRead:
    """
    Updates an NGO partner's verified credential and emits an immutable compliance audit:
    - Requires Admin role with Permission.NGO_VERIFY.
    - Requires CSRF verification.
    - Prevents unverified NGOs from claiming surplus food donations.
    - Preserves historical records completely.
    """
    ngo = db.query(NgoPartner).filter(NgoPartner.id == ngo_id).first()
    if not ngo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"NGO partner '{ngo_id}' not found.",
        )

    old_verified = ngo.verified
    old_badge = ngo.verification_badge

    ngo.verified = req.verified
    if req.verification_badge is not None:
        ngo.verification_badge = req.verification_badge.strip() if req.verification_badge else None
    elif req.verified and not ngo.verification_badge:
        ngo.verification_badge = "Verified Community Food Rescue Partner"

    ngo.updated_at = datetime.now(timezone.utc)

    # Compliance audit event
    action_type = "NGO_VERIFIED" if req.verified else "NGO_VERIFICATION_REVOKED"
    reason_note = f' Reason: "{req.reason.strip()}"' if req.reason and req.reason.strip() else ""
    audit = AuditEvent(
        id=f"log-{uuid.uuid4()}",
        timestamp=datetime.now(timezone.utc).isoformat(),
        actor_name=current_user.user_id,
        actor_role=current_user.role,
        action="NGO_VERIFICATION_UPDATED",
        details=(
            f"Administrator {action_type} for '{ngo.name}' ({ngo.id}). "
            f"Previous: {old_verified}, New: {req.verified}.{reason_note}"
        ),
        severity=AuditSeverity.INFO if req.verified else AuditSeverity.WARNING,
    )
    db.add(audit)
    db.commit()
    db.refresh(ngo)

    logger.info(
        f"NGO '{ngo.id}' verification updated to {req.verified} by admin {current_user.user_id}"
    )
    return NgoPartnerRead.model_validate(ngo)


@router.patch(
    "/ngos/{ngo_id}/activate",
    response_model=NgoPartnerRead,
    status_code=status.HTTP_200_OK,
    summary="Activate or deactivate NGO partner organization",
    dependencies=[Depends(require_csrf)],
)
@router.post(
    "/ngos/{ngo_id}/activate",
    response_model=NgoPartnerRead,
    status_code=status.HTTP_200_OK,
    summary="Activate or deactivate NGO partner organization (POST alias)",
    dependencies=[Depends(require_csrf)],
)
def activate_ngo_partner(
    ngo_id: str,
    req: NgoActivateRequest,
    current_user: AuthenticatedUser = Depends(_require_admin_role),
    db: Session = Depends(get_db),
) -> NgoPartnerRead:
    """
    Activates or deactivates an NGO partner:
    - When deactivated, the NGO and its associated users are immediately barred
      from claiming surplus food offers.
    - Historical donations, pickups, and audit logs are safely preserved (never deleted).
    - Requires Admin role and CSRF validation.
    """
    ngo = db.query(NgoPartner).filter(NgoPartner.id == ngo_id).first()
    if not ngo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"NGO partner '{ngo_id}' not found.",
        )

    old_active = ngo.is_active
    ngo.is_active = req.is_active
    ngo.updated_at = datetime.now(timezone.utc)

    # Synchronously update associated user accounts and revoke sessions so deactivated users cannot act
    associated_users = db.query(User).filter(User.ngo_id == ngo_id).all()
    for u in associated_users:
        u.is_active = req.is_active
        u.updated_at = datetime.now(timezone.utc)
        if not req.is_active:
            invalidate_all_user_sessions(db, u.id)

    action_label = "ACTIVATED" if req.is_active else "DEACTIVATED"
    reason_note = f' Reason: "{req.reason.strip()}"' if req.reason and req.reason.strip() else ""
    audit = AuditEvent(
        id=f"log-{uuid.uuid4()}",
        timestamp=datetime.now(timezone.utc).isoformat(),
        actor_name=current_user.user_id,
        actor_role=current_user.role,
        action="NGO_ACTIVATION_UPDATED",
        details=(
            f"Administrator {action_label} partner organization '{ngo.name}' ({ngo.id}). "
            f"Previous: {old_active}, New: {req.is_active}. "
            f"Updated {len(associated_users)} linked user accounts.{reason_note}"
        ),
        severity=AuditSeverity.WARNING if not req.is_active else AuditSeverity.INFO,
    )
    db.add(audit)
    db.commit()
    db.refresh(ngo)

    logger.info(
        f"NGO '{ngo.id}' active status set to {req.is_active} by admin {current_user.user_id}"
    )
    return NgoPartnerRead.model_validate(ngo)


# ── 2. System Configuration Management ────────────────────────────────────────

@router.get(
    "/system-config",
    response_model=SystemConfigListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all allowed system operational configuration parameters",
)
def list_system_configs(
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.SYSTEM_CONFIG_MANAGE)),
    db: Session = Depends(get_db),
) -> SystemConfigListResponse:
    """
    Returns the allowlist of system operational parameters:
    - Production security credentials and database URLs are strictly excluded.
    - Returns only configurable food-safety and dining governance parameters.
    """
    configs = db.query(SystemConfig).filter(SystemConfig.key.in_(ALLOWED_CONFIG_KEYS.keys())).all()

    # Ensure all allowlisted keys are represented
    found_keys = {c.key for c in configs}
    now_dt = datetime.now(timezone.utc)
    for k, desc in ALLOWED_CONFIG_KEYS.items():
        if k not in found_keys:
            default_val: Any = {}
            if k == "messaver_safety_buffer":
                default_val = {"currentPercent": 5.0, "minPercent": 0.0, "maxPercent": 20.0}
            elif k == "messaver_meal_cutoffs":
                default_val = {"Breakfast": "07:30 AM", "Lunch": "11:30 AM", "Snacks": "04:00 PM", "Dinner": "06:00 PM"}
            elif k == "messaver_food_safety_rules":
                default_val = {"min_holding_temp_celsius": 60.0, "max_holding_window_mins": 120, "student_cutoff_hours": 2.0}

            new_c = SystemConfig(
                key=k,
                value=default_val,
                description=desc,
                updated_by="system_default",
            )
            db.add(new_c)
            db.commit()
            configs.append(new_c)

    return SystemConfigListResponse(
        items=[SystemConfigRead.model_validate(c) for c in configs],
        total=len(configs),
    )


@router.get(
    "/system-config/{key}",
    response_model=SystemConfigRead,
    status_code=status.HTTP_200_OK,
    summary="Inspect a specific system configuration parameter",
)
def get_system_config(
    key: str,
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.SYSTEM_CONFIG_MANAGE)),
    db: Session = Depends(get_db),
) -> SystemConfigRead:
    """
    Returns a single allowlisted configuration setting.
    Arbitrary or secret keys are rejected.
    """
    if key not in ALLOWED_CONFIG_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Configuration key '{key}' is not in the permitted system configuration allowlist.",
        )

    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if not config:
        # Auto-initialize default
        default_val: Any = {}
        if key == "messaver_safety_buffer":
            default_val = {"currentPercent": 5.0, "minPercent": 0.0, "maxPercent": 20.0}
        elif key == "messaver_meal_cutoffs":
            default_val = {"Breakfast": "07:30 AM", "Lunch": "11:30 AM", "Snacks": "04:00 PM", "Dinner": "06:00 PM"}
        elif key == "messaver_food_safety_rules":
            default_val = {"min_holding_temp_celsius": 60.0, "max_holding_window_mins": 120, "student_cutoff_hours": 2.0}

        config = SystemConfig(
            key=key,
            value=default_val,
            description=ALLOWED_CONFIG_KEYS[key],
            updated_by="system_default",
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    return SystemConfigRead.model_validate(config)


@router.put(
    "/system-config/{key}",
    response_model=SystemConfigRead,
    status_code=status.HTTP_200_OK,
    summary="Update an allowlisted system configuration parameter",
    dependencies=[Depends(require_csrf)],
)
def update_system_config(
    key: str,
    req: SystemConfigUpdateRequest,
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.SYSTEM_CONFIG_MANAGE)),
    db: Session = Depends(get_db),
) -> SystemConfigRead:
    """
    Updates an operational configuration setting with mandatory audit trail:
    - Key must be in the explicit configuration allowlist.
    - Rejects any attempt to store or manipulate credentials or secrets.
    - Requires CSRF verification and non-empty administrative justification.
    """
    if key not in ALLOWED_CONFIG_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Configuration key '{key}' is not in the permitted system configuration allowlist.",
        )

    # Security check: Never allow values with secret keywords
    val_str = str(req.value).lower()
    for forbidden in FORBIDDEN_SECRET_SUBSTRINGS:
        if forbidden in val_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Security violation: Configuration values cannot contain sensitive security token keywords ('{forbidden}').",
            )

    clean_reason = req.reason.strip()
    if len(clean_reason) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A non-empty justification of at least 5 characters is required for configuration changes.",
        )

    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    old_value = config.value if config else None

    if not config:
        config = SystemConfig(
            key=key,
            value=req.value,
            description=ALLOWED_CONFIG_KEYS[key],
            updated_by=current_user.user_id,
        )
        db.add(config)
    else:
        config.value = req.value
        config.updated_by = current_user.user_id
        config.updated_at = datetime.now(timezone.utc)

    # Audit event
    audit = AuditEvent(
        id=f"log-{uuid.uuid4()}",
        timestamp=datetime.now(timezone.utc).isoformat(),
        actor_name=current_user.user_id,
        actor_role=current_user.role,
        action="SYSTEM_CONFIG_UPDATED",
        details=(
            f"Administrator updated configuration key '{key}'. "
            f'Reason: "{clean_reason}"'
        ),
        severity=AuditSeverity.INFO,
    )
    db.add(audit)
    db.commit()
    db.refresh(config)

    logger.info(
        f"System config '{key}' updated by admin {current_user.user_id}: {clean_reason}"
    )
    return SystemConfigRead.model_validate(config)


# ── 3. Administrative Audit History ───────────────────────────────────────────

@router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
    status_code=status.HTTP_200_OK,
    summary="Query global administrative audit ledger with multi-field filters",
)
def get_administrative_audit_logs(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    action: Optional[str] = Query(None, description="Filter by action name"),
    severity: Optional[AuditSeverity] = Query(None, description="Filter by severity level"),
    actor_role: Optional[UserRole] = Query(None, description="Filter by actor role"),
    search: Optional[str] = Query(None, description="Search actor name, action, or details"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.AUDIT_LOGS_READ)),
    db: Session = Depends(get_db),
) -> AuditLogListResponse:
    """
    Returns global tamper-evident operational audit events:
    - Strictly Administrator access only (Permission.AUDIT_LOGS_READ).
    - Immutable and append-only: No editing or deletion routes exist.
    - Plaintext passwords, tokens, session secrets, and PIN hashes are NEVER exposed.
    """
    query = db.query(AuditEvent)

    if action:
        query = query.filter(AuditEvent.action == action.strip())

    if severity:
        query = query.filter(AuditEvent.severity == severity)

    if actor_role:
        query = query.filter(AuditEvent.actor_role == actor_role)

    if start_date:
        query = query.filter(func.date(AuditEvent.created_at) >= start_date.strip())

    if end_date:
        query = query.filter(func.date(AuditEvent.created_at) <= end_date.strip())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AuditEvent.actor_name.ilike(term),
                AuditEvent.action.ilike(term),
                AuditEvent.details.ilike(term),
            )
        )

    total = query.count()
    items = (
        query.order_by(AuditEvent.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return AuditLogListResponse(
        items=[AuditEventRead.model_validate(it) for it in items],
        total=total,
    )
