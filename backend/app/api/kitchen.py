"""
Kitchen Operations API endpoints:
- POST /api/v1/kitchen/logs: Create a production log with strict waste segregation
- GET /api/v1/kitchen/logs: Retrieve facility-scoped production logs with filters and pagination
- GET /api/v1/kitchen/summary: Facility-scoped summary of production and waste metrics
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
from app.models.audit import AuditEvent
from app.models.enums import AuditSeverity, MealType, UserRole
from app.models.kitchen_log import KitchenLog
from app.models.user import User
from app.schemas.kitchen import (
    KitchenLogCreateRequest,
    KitchenLogHistoryResponse,
    KitchenLogResponse,
    KitchenSummaryResponse,
)

logger = logging.getLogger("messaver.api.kitchen")

router = APIRouter(tags=["Kitchen Operations"])


def _resolve_facility_scope(current_user: AuthenticatedUser, requested_facility: Optional[str] = None) -> str:
    """
    Enforces server-side facility scoping:
    - Kitchen staff & Managers are locked strictly to their assigned facility.
    - Attempting to query or create for a different facility returns 403 Forbidden.
    - Unassigned staff receive 403 Forbidden.
    - Admins can query any facility or their default assigned facility.
    """
    if current_user.is_admin:
        return (requested_facility or current_user.facility_id or "Grand Central Mess - Block B").strip()

    if not current_user.facility_id or not current_user.facility_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no assigned facility.",
        )

    user_fac = current_user.facility_id.strip()
    if requested_facility and requested_facility.strip() != user_fac:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access or create records for your assigned facility.",
        )
    return user_fac


@router.post(
    "/logs",
    response_model=KitchenLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a kitchen production log with waste segregation",
    dependencies=[Depends(require_csrf)],
)
def create_kitchen_log(
    req: KitchenLogCreateRequest,
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.KITCHEN_LOGS_WRITE)),
    db: Session = Depends(get_db),
) -> KitchenLogResponse:
    """
    Records a kitchen production batch log:
    - Enforces strict segregation of edible surplus (kitchen_surplus_kg) from customer plate scraps (plate_waste_kg).
    - Facility identity and recorder name are derived strictly from the server session.
    - Persists an immutable audit log within the same database transaction.
    """
    facility_id = _resolve_facility_scope(current_user)

    user = db.query(User).filter(User.id == current_user.user_id).first()
    recorded_by = user.full_name if user else current_user.user_id

    try:
        new_id = f"klog-{int(datetime.now(timezone.utc).timestamp() * 1000)}-{secrets.token_hex(3)}"
        new_log = KitchenLog(
            id=new_id,
            date=req.date,
            meal_type=req.meal_type,
            dish_name=req.dish_name,
            facility_id=facility_id,
            expected_attendance=req.expected_attendance,
            recommended_kg=req.recommended_kg,
            actual_prepared_kg=req.actual_prepared_kg,
            consumed_kg=req.consumed_kg,
            kitchen_surplus_kg=req.kitchen_surplus_kg,
            plate_waste_kg=req.plate_waste_kg,
            notes=req.notes,
            recorded_by=recorded_by,
            image_url=req.image_url,
        )
        db.add(new_log)

        # Audit event for production tracking
        audit_severity = (
            AuditSeverity.WARNING if req.kitchen_surplus_kg > 15.0 or req.plate_waste_kg > 10.0 else AuditSeverity.INFO
        )
        audit = AuditEvent(
            id=f"log-{uuid.uuid4()}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor_name=recorded_by,
            actor_role=current_user.role,
            action="RECORD_KITCHEN_METRICS",
            details=(
                f"Recorded {req.meal_type.value} batch for '{req.dish_name}': "
                f"Prepared {req.actual_prepared_kg}kg, Consumed {req.consumed_kg}kg, "
                f"Edible Surplus {req.kitchen_surplus_kg}kg, Plate Waste {req.plate_waste_kg}kg "
                f"(Facility: {facility_id})."
            ),
            severity=audit_severity,
        )
        db.add(audit)
        db.flush()
        db.commit()

        logger.info(
            f"Created kitchen log '{new_id}' for {facility_id} by {recorded_by} "
            f"(Surplus: {req.kitchen_surplus_kg}kg, Plate Waste: {req.plate_waste_kg}kg)"
        )
        return KitchenLogResponse.model_validate(new_log)
    except Exception as exc:
        db.rollback()
        logger.error(f"Failed to record kitchen log: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to save kitchen log: {str(exc)}",
        )


@router.get(
    "/logs",
    response_model=KitchenLogHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get facility-scoped kitchen production logs with filters and pagination",
)
def get_kitchen_logs(
    date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Filter single date YYYY-MM-DD"),
    start_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Filter start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Filter end date YYYY-MM-DD"),
    meal_type: Optional[MealType] = Query(None, description="Filter meal slot"),
    facility_id: Optional[str] = Query(None, description="Facility ID (Admins only)"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.KITCHEN_LOGS_READ)),
    db: Session = Depends(get_db),
) -> KitchenLogHistoryResponse:
    """
    Returns facility-scoped production logs:
    - Kitchen staff and Managers are strictly limited to their assigned facility.
    - Admins can query any facility.
    - Supports date range filters, meal type filtering, and pagination.
    """
    target_facility = _resolve_facility_scope(current_user, facility_id)

    query = db.query(KitchenLog).filter(KitchenLog.facility_id == target_facility)

    if date:
        query = query.filter(KitchenLog.date == date)
    if start_date:
        query = query.filter(KitchenLog.date >= start_date)
    if end_date:
        query = query.filter(KitchenLog.date <= end_date)
    if meal_type:
        query = query.filter(KitchenLog.meal_type == meal_type)

    total = query.count()
    items = (
        query.order_by(KitchenLog.date.desc(), KitchenLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return KitchenLogHistoryResponse(
        items=[KitchenLogResponse.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/summary",
    response_model=KitchenSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get facility-scoped kitchen production and waste summary",
)
def get_kitchen_summary(
    date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Date YYYY-MM-DD (defaults to today)"),
    facility_id: Optional[str] = Query(None, description="Facility ID (Admins only)"),
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.KITCHEN_LOGS_READ)),
    db: Session = Depends(get_db),
) -> KitchenSummaryResponse:
    """
    Provides aggregated metrics for a facility:
    - Prepares total food prepared, total food consumed, edible surplus, and plate waste.
    - Calculates operational efficiency rate: (consumed / prepared * 100).
    - Prevents cross-facility data leakage for non-admin roles.
    """
    target_facility = _resolve_facility_scope(current_user, facility_id)
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    logs = (
        db.query(KitchenLog)
        .filter(
            KitchenLog.facility_id == target_facility,
            KitchenLog.date == target_date,
        )
        .all()
    )

    total_batches = len(logs)
    total_prepared = round(sum(log.actual_prepared_kg for log in logs), 2)
    total_consumed = round(sum(log.consumed_kg for log in logs), 2)
    total_surplus = round(sum(log.kitchen_surplus_kg for log in logs), 2)
    total_plate_waste = round(sum(log.plate_waste_kg for log in logs), 2)

    efficiency = round((total_consumed / total_prepared * 100), 1) if total_prepared > 0 else 100.0

    return KitchenSummaryResponse(
        facility_id=target_facility,
        date=target_date,
        total_batches=total_batches,
        total_prepared_kg=total_prepared,
        total_consumed_kg=total_consumed,
        total_kitchen_surplus_kg=total_surplus,
        total_plate_waste_kg=total_plate_waste,
        efficiency_rate=efficiency,
    )
