"""
Surplus Food Donation API endpoints:
- POST /api/v1/surplus: Create surplus donation offer with secure PIN generation and audit event
- GET /api/v1/surplus/me: Retrieve facility-scoped donation offers for kitchen & managers
- GET /api/v1/surplus/available: Retrieve active available offers for operational roles (NGO, Kitchen, Manager, Admin)
"""
from datetime import datetime, timezone
import logging
import secrets
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.auth_dependencies import (
    AuthenticatedUser,
    Permission,
    RequirePermission,
    get_current_user,
    require_csrf,
)
from app.core.database import get_db
from app.core.pin_security import hash_pickup_pin, pin_tracker, verify_pickup_pin
from app.models.audit import AuditEvent
from app.models.donation import SurplusDonation
from app.models.enums import AuditSeverity, DonationStatus, UserRole
from app.models.ngo import NgoPartner
from app.models.user import User
from app.schemas.donation import (
    DonationClaimRequest,
    PickupVerificationRequest,
    PickupVerificationResponse,
    SurplusDonationCreateRequest,
    SurplusDonationCreateResponse,
    SurplusDonationListResponse,
    SurplusDonationRead,
)

logger = logging.getLogger("messaver.api.surplus")


def is_donation_expired(expiry_deadline: str, now_utc: Optional[datetime] = None) -> bool:
    """
    Evaluates whether a donation's expiry deadline has elapsed.
    Uses UTC-aware timestamps and consistent clock comparison.
    """
    if not expiry_deadline:
        return False
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)
    try:
        clean = expiry_deadline.replace("Z", "+00:00")
        exp_dt = datetime.fromisoformat(clean)
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
        return exp_dt <= now_utc
    except Exception:
        return False


router = APIRouter(tags=["Surplus Food Redistribution"])


def _require_facility_surplus_access(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Enforces that only kitchen staff, managers, or admins can view facility surplus offers."""
    if current_user.role not in {UserRole.KITCHEN, UserRole.MANAGER, UserRole.ADMIN}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view facility surplus offers.",
        )
    return current_user


def _require_available_surplus_access(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Enforces that operational roles (NGOs, Kitchen, Managers, Admins) can view available offers."""
    if current_user.role not in {UserRole.NGO, UserRole.KITCHEN, UserRole.MANAGER, UserRole.ADMIN}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view available surplus offers.",
        )
    return current_user


@router.post(
    "",
    response_model=SurplusDonationCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a surplus food donation offer",
    dependencies=[Depends(require_csrf)],
)
def create_surplus_donation(
    req: SurplusDonationCreateRequest,
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.SURPLUS_CREATE)),
    db: Session = Depends(get_db),
) -> SurplusDonationCreateResponse:
    """
    Creates an edible surplus food donation offer:
    - Only authorized kitchen staff (or admins) can create offers.
    - Facility is derived strictly from the server-validated session.
    - Strict Food Safety: rejects plate leftovers (is_plate_leftover=False required).
    - Temperature control: packaging temperature must be >= 60°C or <= 8°C.
    - Expiry deadline: must be a valid future ISO timestamp.
    - Generates cryptographic pickup PIN hash (bcrypt + server pepper).
    - One-time plaintext PIN is returned in the response for supervisor handover to collector.
    - Plaintext PIN is NEVER saved to database or printed in logs.
    - An immutable audit trail event is committed in the same atomic transaction.
    """
    # 1. Facility scoping
    if not current_user.facility_id or not current_user.facility_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no assigned kitchen facility.",
        )
    kitchen_facility = current_user.facility_id.strip()

    # 2. Strict Food Safety Validation
    if req.is_plate_leftover:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Food Safety Policy Violation: Customer plate leftovers strictly barred from human consumption redistribution.",
        )

    if 8.0 < req.temperature_at_packaging < 60.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Critical Temperature Warning ({req.temperature_at_packaging}°C): "
                f"Food must be hot-held (>= 60°C) or rapid-chilled (<= 8°C) before safe packing."
            ),
        )

    # 3. Expiry deadline validation
    try:
        clean_deadline = req.expiry_deadline.replace("Z", "+00:00")
        exp_dt = datetime.fromisoformat(clean_deadline)
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
        if exp_dt <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expiry deadline must be in the future.",
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ISO format for expiry_deadline.",
        )

    # 4. Generate unique donation ID
    donation_id = f"DON-{secrets.randbelow(9000) + 1000}"
    # Prevent collision if ID exists
    while db.query(SurplusDonation).filter(SurplusDonation.id == donation_id).first():
        donation_id = f"DON-{secrets.randbelow(90000) + 10000}"

    # 5. Generate secure 4-digit pickup PIN and hash with server-side pepper
    plain_pin = f"{secrets.randbelow(9000) + 1000}"
    pin_hash = hash_pickup_pin(plain_pin, donation_id)

    # 6. Fetch supervisor full name
    user = db.query(User).filter(User.id == current_user.user_id).first()
    actor_name = user.full_name if user else current_user.user_id

    # 7. Convert dishes Pydantic models to dicts for JSON column
    dishes_data = [d.model_dump() for d in req.dishes]

    try:
        new_donation = SurplusDonation(
            id=donation_id,
            food_title=req.food_title,
            dishes=dishes_data,
            total_quantity_kg=req.total_quantity_kg,
            servings_count=req.servings_count,
            meal_type=req.meal_type,
            prepared_at=req.prepared_at,
            temperature_at_packaging=req.temperature_at_packaging,
            is_hygienically_packed=req.is_hygienically_packed,
            is_plate_leftover=False,
            expiry_deadline=req.expiry_deadline,
            status=DonationStatus.AVAILABLE,
            pickup_pin_hash=pin_hash,
            kitchen_facility=kitchen_facility,
            pickup_location=req.pickup_location,
            beneficiary_target=req.beneficiary_target,
            image_url=req.image_url,
        )
        db.add(new_donation)

        # Audit event created atomically
        audit = AuditEvent(
            id=f"log-{uuid.uuid4()}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor_name=actor_name,
            actor_role=current_user.role,
            action="SURPLUS_OFFERED",
            details=(
                f"Created donation offer #{donation_id} ({req.total_quantity_kg}kg, "
                f"~{req.servings_count} portions) at {kitchen_facility}. "
                f"Temperature verified at {req.temperature_at_packaging}°C. Plate leftovers check: Zero (Passed)."
            ),
            severity=AuditSeverity.SUCCESS,
        )
        db.add(audit)
        db.flush()
        db.commit()

        logger.info(
            f"Created surplus donation '{donation_id}' at {kitchen_facility} "
            f"({req.total_quantity_kg}kg, {req.servings_count} servings)"
        )

        response_dict = SurplusDonationRead.model_validate(new_donation).model_dump()
        response_dict["pickup_pin"] = plain_pin
        return SurplusDonationCreateResponse(**response_dict)
    except Exception as exc:
        db.rollback()
        logger.error(f"Failed to create surplus donation offer: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to create surplus donation offer: {str(exc)}",
        )


@router.get(
    "/me",
    response_model=SurplusDonationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get donation offers created by authenticated user's facility",
)
def get_my_facility_donations(
    status_filter: Optional[DonationStatus] = Query(None, alias="status", description="Filter by status"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: AuthenticatedUser = Depends(_require_facility_surplus_access),
    db: Session = Depends(get_db),
) -> SurplusDonationListResponse:
    """
    Returns donation offers for the authenticated user's assigned facility:
    - Kitchen staff and managers only see their own facility's offers.
    - Admins see all or their assigned facility.
    - Strict Security: Plaintext PIN and pin hash are NEVER returned.
    """
    if not current_user.facility_id or not current_user.facility_id.strip():
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no assigned facility.",
            )
        facility_id = "Grand Central Mess - Block B"
    else:
        facility_id = current_user.facility_id.strip()

    query = db.query(SurplusDonation).filter(SurplusDonation.kitchen_facility == facility_id)

    if status_filter:
        query = query.filter(SurplusDonation.status == status_filter)

    total = query.count()
    items = (
        query.order_by(SurplusDonation.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return SurplusDonationListResponse(
        items=[SurplusDonationRead.model_validate(i) for i in items],
        total=total,
    )


@router.get(
    "/available",
    response_model=SurplusDonationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get currently available surplus donation offers for human consumption",
)
def get_available_donations(
    facility_id: Optional[str] = Query(None, description="Filter by facility"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: AuthenticatedUser = Depends(_require_available_surplus_access),
    db: Session = Depends(get_db),
) -> SurplusDonationListResponse:
    """
    Returns all active donation offers with status AVAILABLE:
    - Accessible to operational roles: NGOs, Kitchen staff, Managers, and Admins.
    - Students are strictly forbidden (403).
    - Strict Security: Plaintext PIN and pin hash are NEVER returned.
    - Excludes expired offers from available results, even if cleanup task has not run.
    """
    now_utc = datetime.now(timezone.utc)

    query = db.query(SurplusDonation).filter(SurplusDonation.status == DonationStatus.AVAILABLE)

    if facility_id:
        query = query.filter(SurplusDonation.kitchen_facility == facility_id.strip())

    all_available = query.order_by(SurplusDonation.created_at.desc()).all()

    # Exclude expired offers and lazily update status in database
    unexpired = []
    expired_found = False
    for item in all_available:
        if is_donation_expired(item.expiry_deadline, now_utc):
            item.status = DonationStatus.EXPIRED
            expired_found = True
        else:
            unexpired.append(item)

    if expired_found:
        try:
            db.commit()
        except Exception:
            db.rollback()

    total = len(unexpired)
    paginated_items = unexpired[offset : offset + limit]

    return SurplusDonationListResponse(
        items=[SurplusDonationRead.model_validate(i) for i in paginated_items],
        total=total,
    )


@router.get(
    "/claimed/me",
    response_model=SurplusDonationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get donations claimed by the authenticated NGO partner",
)
def get_my_claimed_donations(
    status_filter: Optional[DonationStatus] = Query(None, alias="status", description="Filter by status (e.g. CLAIMED, COMPLETED)"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SurplusDonationListResponse:
    """
    Returns donations claimed strictly by the authenticated NGO partner:
    - Enforces NGO least-privilege: user must have NGO role with an assigned NGO ID.
    - Complete cross-NGO isolation: an NGO can NEVER see another NGO's claimed donations.
    - Strict Security: Plaintext PIN and pin hash are NEVER returned.
    """
    if current_user.role not in {UserRole.NGO, UserRole.ADMIN}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only NGO partners can view their claimed donations.",
        )

    if not current_user.ngo_id or not current_user.ngo_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no assigned NGO partner organization.",
        )

    ngo_id = current_user.ngo_id.strip()
    query = db.query(SurplusDonation).filter(SurplusDonation.claimed_by_ngo_id == ngo_id)

    if status_filter:
        query = query.filter(SurplusDonation.status == status_filter)

    total = query.count()
    items = (
        query.order_by(SurplusDonation.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return SurplusDonationListResponse(
        items=[SurplusDonationRead.model_validate(i) for i in items],
        total=total,
    )


@router.post(
    "/{donation_id}/claim",
    response_model=SurplusDonationRead,
    status_code=status.HTTP_200_OK,
    summary="Claim an available surplus food donation offer",
    dependencies=[Depends(require_csrf)],
)
def claim_surplus_donation(
    donation_id: str,
    req: Optional[DonationClaimRequest] = None,
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.DONATION_CLAIM)),
    db: Session = Depends(get_db),
) -> SurplusDonationRead:
    """
    Claims an available surplus donation offer on behalf of an authorized NGO:
    - Requires authenticated NGO account with Permission.DONATION_CLAIM.
    - Identity is strictly derived from the server session (current_user.ngo_id).
    - Client-supplied NGO IDs are never trusted or permitted to override session.
    - Inactive accounts or unverified NGOs are strictly barred (403).
    - Verifies donation exists (404), is AVAILABLE, and has not expired (400).
    - Uses an atomic conditional update to guarantee that competing concurrent
      NGO requests never double-claim (loser receives 409 Conflict).
    - Emits an immutable audit event upon success.
    - Response never exposes PIN hash or secrets.
    """
    # 1. Validate NGO assignment
    if not current_user.ngo_id or not current_user.ngo_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no assigned NGO partner organization.",
        )

    # 2. Validate NGO active and verified status
    user_db = db.query(User).filter(User.id == current_user.user_id).first()
    if not user_db or not user_db.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive or disabled.",
        )

    ngo = db.query(NgoPartner).filter(NgoPartner.id == current_user.ngo_id).first()
    if not ngo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Assigned NGO partner does not exist.",
        )

    if not ngo.verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only verified NGO partners are eligible to claim surplus donations.",
        )

    # 3. Fetch donation and validate initial state
    donation = db.query(SurplusDonation).filter(SurplusDonation.id == donation_id).first()
    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Donation offer '{donation_id}' not found.",
        )

    # 4. Check food safety expiry
    now_utc = datetime.now(timezone.utc)
    if is_donation_expired(donation.expiry_deadline, now_utc):
        donation.status = DonationStatus.EXPIRED
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Food safety window has expired for this surplus offer. It can no longer be claimed.",
        )

    # 5. Check status transitions
    if donation.status == DonationStatus.CLAIMED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This donation offer has already been claimed by {donation.claimed_by_ngo_name or 'another partner'}.",
        )
    if donation.status == DonationStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This donation offer has already been completed.",
        )
    if donation.status != DonationStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Donation is in status '{donation.status}' and cannot be claimed.",
        )

    # 6. Atomic conditional update to eliminate race conditions
    now_iso = now_utc.isoformat()
    rows_updated = (
        db.query(SurplusDonation)
        .filter(
            SurplusDonation.id == donation_id,
            SurplusDonation.status == DonationStatus.AVAILABLE,
        )
        .update(
            {
                "status": DonationStatus.CLAIMED,
                "claimed_by_ngo_id": current_user.ngo_id,
                "claimed_by_ngo_name": ngo.name,
                "claimed_at": now_iso,
            },
            synchronize_session=False,
        )
    )

    if rows_updated == 0:
        db.rollback()
        refetched = db.query(SurplusDonation).filter(SurplusDonation.id == donation_id).first()
        if not refetched:
            raise HTTPException(status_code=404, detail="Donation offer not found.")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This donation offer has already been claimed by {refetched.claimed_by_ngo_name or 'another partner'}.",
        )

    # 7. Audit event
    actor_name = user_db.full_name if user_db else current_user.user_id
    audit = AuditEvent(
        id=f"log-{uuid.uuid4()}",
        timestamp=now_iso,
        actor_name=f"{actor_name} ({ngo.name})",
        actor_role=current_user.role,
        action="DONATION_CLAIMED",
        details=(
            f"Atomically claimed donation #{donation_id} ({donation.total_quantity_kg}kg, "
            f"~{donation.servings_count} portions) from {donation.kitchen_facility} by NGO '{ngo.name}' (ID: {ngo.id})."
        ),
        severity=AuditSeverity.SUCCESS,
    )
    db.add(audit)
    db.commit()
    db.refresh(donation)

    logger.info(f"Donation '{donation_id}' claimed by NGO '{ngo.name}' (ID: {ngo.id})")
    return SurplusDonationRead.model_validate(donation)


@router.post(
    "/{donation_id}/verify-pickup",
    response_model=PickupVerificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify pickup PIN and atomically complete donation handover",
    dependencies=[Depends(require_csrf)],
)
def verify_pickup_and_complete_handover(
    donation_id: str,
    req: PickupVerificationRequest,
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.HANDOVER_VERIFY)),
    db: Session = Depends(get_db),
) -> PickupVerificationResponse:
    """
    Verifies collector PIN and records handover completion at facility gate:
    - Authorized kitchen staff (or admin) only (Permission.HANDOVER_VERIFY).
    - Enforces facility ownership: staff must belong to the facility creating the donation.
    - Requires CSRF token.
    - Uses server-side peppered bcrypt PIN verification with contextual domain separation.
    - Never logs or exposes plaintext PIN, PIN hash, or server pepper.
    - Enforces shared bounded rate limiting and 15-minute lockout (pin_tracker).
    - Status must be CLAIMED and offer must not be expired.
    - Atomically updates donation status to COMPLETED, records completed_at,
      increments NGO total_pickups_completed and meals_distributed metrics,
      and writes an immutable audit event.
    - Concurrent verification requests cannot double-complete or double-count.
    """
    # 1. Fetch donation
    donation = db.query(SurplusDonation).filter(SurplusDonation.id == donation_id).first()
    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Donation offer '{donation_id}' not found.",
        )

    # 2. Facility scoping (Admins bypass)
    if not current_user.is_admin:
        if not current_user.facility_id or not current_user.facility_id.strip():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no assigned facility.",
            )
        if current_user.facility_id.strip() != donation.kitchen_facility.strip():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only verify handovers for your assigned facility.",
            )

    # 3. Validate donation lifecycle status
    if donation.status == DonationStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Donation must be claimed by an authorized NGO before pickup verification.",
        )
    if donation.status == DonationStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Donation handover has already been completed.",
        )
    if donation.status != DonationStatus.CLAIMED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Donation is in status '{donation.status}'. Must be CLAIMED to verify handover.",
        )

    # 4. Food safety expiry check
    now_utc = datetime.now(timezone.utc)
    if is_donation_expired(donation.expiry_deadline, now_utc):
        donation.status = DonationStatus.EXPIRED
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Donation safety window has expired; handover cannot be completed.",
        )

    # 5. Rate limiting and lockout enforcement
    if pin_tracker.is_locked(donation_id):
        remaining = pin_tracker.get_lockout_remaining(donation_id) or 900
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"PIN verification temporarily locked due to excessive failed attempts. Please contact a manager or try again in {remaining} seconds.",
        )

    # 6. Verify 4-digit PIN using keyed peppered bcrypt
    user_db = db.query(User).filter(User.id == current_user.user_id).first()
    actor_name = user_db.full_name if user_db else current_user.user_id

    is_valid_pin = verify_pickup_pin(req.pin, donation_id, donation.pickup_pin_hash)
    if not is_valid_pin:
        attempts = pin_tracker.record_failure(donation_id)
        # Record security audit event without revealing secret
        audit = AuditEvent(
            id=f"log-{uuid.uuid4()}",
            timestamp=now_utc.isoformat(),
            actor_name=actor_name,
            actor_role=current_user.role,
            action="PIN_VERIFICATION_FAILED",
            details=f"Invalid pickup PIN submitted for donation #{donation_id} at {donation.kitchen_facility} (attempt {attempts}).",
            severity=AuditSeverity.WARNING,
        )
        db.add(audit)
        db.commit()

        if pin_tracker.is_locked(donation_id):
            remaining = pin_tracker.get_lockout_remaining(donation_id) or 900
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"PIN verification temporarily locked due to excessive failed attempts. Please contact a manager or try again in {remaining} seconds.",
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 4-digit pickup PIN. Please check the PIN provided by the collection driver.",
        )

    # 7. Valid PIN: reset tracker
    pin_tracker.reset(donation_id)

    # 8. Atomic conditional completion
    now_iso = now_utc.isoformat()
    updated_rows = (
        db.query(SurplusDonation)
        .filter(
            SurplusDonation.id == donation_id,
            SurplusDonation.status == DonationStatus.CLAIMED,
        )
        .update(
            {
                "status": DonationStatus.COMPLETED,
                "completed_at": now_iso,
            },
            synchronize_session=False,
        )
    )

    if updated_rows == 0:
        db.rollback()
        refetched = db.query(SurplusDonation).filter(SurplusDonation.id == donation_id).first()
        if not refetched:
            raise HTTPException(status_code=404, detail="Donation offer not found.")
        if refetched.status == DonationStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Donation handover has already been completed.")
        raise HTTPException(
            status_code=400,
            detail=f"Donation is in status '{refetched.status}'. Must be CLAIMED to verify handover.",
        )

    # 9. Atomically increment NGO pickup and meal metrics
    if donation.claimed_by_ngo_id:
        db.query(NgoPartner).filter(NgoPartner.id == donation.claimed_by_ngo_id).update(
            {
                NgoPartner.total_pickups_completed: NgoPartner.total_pickups_completed + 1,
                NgoPartner.meals_distributed: NgoPartner.meals_distributed + donation.servings_count,
            },
            synchronize_session=False,
        )

    # 10. Audit event for completed handover
    audit = AuditEvent(
        id=f"log-{uuid.uuid4()}",
        timestamp=now_iso,
        actor_name=actor_name,
        actor_role=current_user.role,
        action="HANDOVER_VERIFIED",
        details=(
            f"PIN verified! Handover completed for #{donation_id} to {donation.claimed_by_ngo_name}. "
            f"{donation.servings_count} meals ({donation.total_quantity_kg}kg) redirected from waste."
        ),
        severity=AuditSeverity.SUCCESS,
    )
    db.add(audit)
    db.commit()
    db.refresh(donation)

    logger.info(
        f"Donation '{donation_id}' handover successfully verified and completed by {actor_name} "
        f"at {donation.kitchen_facility}"
    )

    donation_dict = SurplusDonationRead.model_validate(donation).model_dump()
    return PickupVerificationResponse(
        **donation_dict,
        success=True,
        message="Handover verified and donation completed successfully.",
    )


@router.get(
    "/{donation_id}",
    response_model=SurplusDonationRead,
    status_code=status.HTTP_200_OK,
    summary="Get details of a specific surplus donation offer",
)
def get_donation_by_id(
    donation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SurplusDonationRead:
    """
    Returns public details of a specific surplus donation offer:
    - Students are forbidden (403).
    - NGOs can view available donations or donations claimed by their own NGO.
    - Kitchen staff and managers can view donations created by their own facility.
    - Admins can view any donation.
    - Strict Security: Plaintext PIN and pin hash are NEVER returned.
    """
    if current_user.role == UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students cannot access surplus donation records.",
        )

    donation = db.query(SurplusDonation).filter(SurplusDonation.id == donation_id).first()
    if not donation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Donation offer '{donation_id}' not found.",
        )

    # Scoping checks
    if current_user.role == UserRole.NGO:
        if donation.status != DonationStatus.AVAILABLE and donation.claimed_by_ngo_id != current_user.ngo_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view another NGO's private claim.",
            )
    elif current_user.role in {UserRole.KITCHEN, UserRole.MANAGER}:
        if not current_user.is_admin and current_user.facility_id != donation.kitchen_facility:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view donations from your assigned facility.",
            )

    return SurplusDonationRead.model_validate(donation)

