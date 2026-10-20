"""
Student Meal Attendance API endpoints:
- POST /api/v1/attendance: Record/update meal attendance for authenticated student
- GET /api/v1/attendance/me: Retrieve personal attendance history
- GET /api/v1/attendance/summary: Facility-scoped aggregate attendance for managers and admins
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth_dependencies import (
    AuthenticatedUser,
    Permission,
    RequirePermission,
    assert_same_facility,
    get_current_user,
    require_csrf,
)
from app.core.cutoff_service import assert_attendance_cutoff_not_passed
from app.core.database import get_db
from app.models.attendance import StudentAttendance
from app.models.enums import MealType, UserRole
from app.models.user import User
from app.schemas.attendance import (
    AttendanceHistoryResponse,
    AttendanceResponse,
    AttendanceSubmitRequest,
    FacilityAttendanceSummary,
    MealAttendanceStat,
)

logger = logging.getLogger("messaver.api.attendance")

router = APIRouter(tags=["Student Attendance"])


@router.post(
    "",
    response_model=AttendanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Record or update attendance for authenticated student",
    dependencies=[Depends(require_csrf)],
)
def record_attendance(
    req: AttendanceSubmitRequest,
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.OWN_ATTENDANCE_WRITE)),
    db: Session = Depends(get_db),
) -> AttendanceResponse:
    """
    Records or updates attendance (opt-in/opt-out) for a specific meal slot.
    - Identity is derived strictly from the server-side session (anti-spoofing).
    - Enforces configured institutional cutoff deadlines.
    - Prevents duplicates on (student_id, date, meal_type) via deterministic upsert.
    - Catches concurrent race conditions safely without exposing SQL errors.
    """
    student_id = current_user.user_id

    # 1. Fetch student user profile for display name
    user = db.query(User).filter(User.id == student_id).first()
    student_name = user.full_name if user else student_id

    # 2. Enforce attendance cutoff deadline
    assert_attendance_cutoff_not_passed(req.meal_type, req.date, db=db)

    # 3. Check for existing attendance record
    existing = (
        db.query(StudentAttendance)
        .filter(
            StudentAttendance.student_id == student_id,
            StudentAttendance.date == req.date,
            StudentAttendance.meal_type == req.meal_type,
        )
        .first()
    )

    if existing:
        existing.attending = req.attending
        existing.student_name = student_name
        db.flush()
        db.commit()
        logger.info(
            f"Updated attendance for student '{student_id}' on {req.date} {req.meal_type.value}: "
            f"attending={req.attending}"
        )
        return AttendanceResponse.model_validate(existing)

    # 4. Insert new attendance record with concurrent uniqueness race-condition protection
    try:
        new_record = StudentAttendance(
            student_id=student_id,
            student_name=student_name,
            date=req.date,
            meal_type=req.meal_type,
            attending=req.attending,
        )
        db.add(new_record)
        db.flush()
        db.commit()
        logger.info(
            f"Created attendance for student '{student_id}' on {req.date} {req.meal_type.value}: "
            f"attending={req.attending}"
        )
        return AttendanceResponse.model_validate(new_record)
    except IntegrityError:
        db.rollback()
        # Concurrent submission resolved deterministically
        record = (
            db.query(StudentAttendance)
            .filter(
                StudentAttendance.student_id == student_id,
                StudentAttendance.date == req.date,
                StudentAttendance.meal_type == req.meal_type,
            )
            .first()
        )
        if record:
            record.attending = req.attending
            record.student_name = student_name
            db.flush()
            db.commit()
            return AttendanceResponse.model_validate(record)

        logger.error(f"Failed to record attendance for student '{student_id}' on {req.date}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to save attendance submission.",
        )


@router.get(
    "/me",
    response_model=AttendanceHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated student's personal attendance history",
)
def get_my_attendance(
    start_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Filter start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Filter end date YYYY-MM-DD"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.OWN_ATTENDANCE_READ)),
    db: Session = Depends(get_db),
) -> AttendanceHistoryResponse:
    """
    Returns only the authenticated student's attendance history.
    Strictly isolates student records; never exposes another student's data.
    Supports validated date-range filtering and pagination.
    """
    query = db.query(StudentAttendance).filter(
        StudentAttendance.student_id == current_user.user_id
    )

    if start_date:
        query = query.filter(StudentAttendance.date >= start_date)
    if end_date:
        query = query.filter(StudentAttendance.date <= end_date)

    total = query.count()
    items = (
        query.order_by(StudentAttendance.date.desc(), StudentAttendance.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return AttendanceHistoryResponse(
        items=[AttendanceResponse.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/summary",
    response_model=FacilityAttendanceSummary,
    status_code=status.HTTP_200_OK,
    summary="Get facility-scoped attendance aggregate summary",
)
def get_attendance_summary(
    date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Target date YYYY-MM-DD"),
    facility_id: Optional[str] = Query(None, description="Target facility ID (Admins only)"),
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.FACILITY_ATTENDANCE_READ)),
    db: Session = Depends(get_db),
) -> FacilityAttendanceSummary:
    """
    Returns facility-scoped attendance headcount aggregates for institutional planning.
    - Managers can ONLY query their assigned facility (server-enforced).
    - Admins can query any facility or their default assigned facility.
    - Unassigned or unauthorized roles are strictly forbidden (403).
    """
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Facility scoping validation
    if current_user.is_manager:
        if not current_user.facility_id or not current_user.facility_id.strip():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Manager has no assigned facility.",
            )
        if facility_id and facility_id.strip() != current_user.facility_id.strip():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access attendance summary for your assigned facility.",
            )
        target_facility = current_user.facility_id.strip()
    elif current_user.is_admin:
        target_facility = (facility_id or current_user.facility_id or "Grand Central Mess - Block B").strip()
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view attendance summaries.",
        )

    # 1. Total active students enrolled in this facility
    enrolled_count = (
        db.query(User)
        .filter(
            User.role == UserRole.STUDENT,
            User.facility_id == target_facility,
            User.is_active == True,
        )
        .count()
    )

    # 2. Query attendance joined with student users for facility scoping
    attendance_records = (
        db.query(StudentAttendance)
        .join(User, StudentAttendance.student_id == User.id)
        .filter(
            User.facility_id == target_facility,
            StudentAttendance.date == target_date,
        )
        .all()
    )

    # 3. Aggregate metrics by meal slot
    stats_by_meal: dict[MealType, dict[str, int]] = {
        m: {"attending": 0, "opted_out": 0} for m in MealType
    }

    overall_attending = 0
    overall_opted_out = 0

    for rec in attendance_records:
        slot = rec.meal_type
        if slot in stats_by_meal:
            if rec.attending:
                stats_by_meal[slot]["attending"] += 1
                overall_attending += 1
            else:
                stats_by_meal[slot]["opted_out"] += 1
                overall_opted_out += 1

    meal_stats = [
        MealAttendanceStat(
            meal_type=m,
            attending_count=counts["attending"],
            opted_out_count=counts["opted_out"],
            total_responses=counts["attending"] + counts["opted_out"],
        )
        for m, counts in stats_by_meal.items()
    ]

    return FacilityAttendanceSummary(
        date=target_date,
        facility_id=target_facility,
        total_students_enrolled=enrolled_count,
        overall_attending=overall_attending,
        overall_opted_out=overall_opted_out,
        meals=meal_stats,
    )
