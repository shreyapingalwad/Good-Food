"""
Meal attendance cutoff enforcement service.

Enforces institutional cutoff deadlines:
- Breakfast: 07:30 AM
- Lunch: 11:30 AM
- Snacks: 04:00 PM (16:00)
- Dinner: 06:00 PM (18:00)

Business Rules:
1. Past dates (date < today) are strictly closed.
2. Future dates (date > today) are open for advance opt-in / opt-out.
3. Current date (date == today):
   Attendance mutations are rejected if the current time has reached or passed
   the configured meal cutoff deadline.
4. Cutoff deadlines can be read from SystemConfig (key: 'messaver_meal_cutoffs')
   or fall back to institutional defaults.
"""
from datetime import date, datetime, time, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import MealType
from app.models.system_config import SystemConfig

DEFAULT_CUTOFF_TIMES: dict[MealType, time] = {
    MealType.BREAKFAST: time(7, 30),
    MealType.LUNCH: time(11, 30),
    MealType.SNACKS: time(16, 0),
    MealType.DINNER: time(18, 0),
}

DEFAULT_CUTOFF_STRINGS: dict[MealType, str] = {
    MealType.BREAKFAST: "07:30 AM",
    MealType.LUNCH: "11:30 AM",
    MealType.SNACKS: "04:00 PM",
    MealType.DINNER: "06:00 PM",
}


def _parse_time_string(time_str: str) -> Optional[time]:
    """Parses various time formats like '11:30 AM', '04:00 PM', or '11:30'."""
    formats = ["%I:%M %p", "%H:%M", "%I:%M%p"]
    for fmt in formats:
        try:
            return datetime.strptime(time_str.strip(), fmt).time()
        except ValueError:
            continue
    return None


def get_cutoff_time(meal_type: MealType, db: Optional[Session] = None) -> tuple[time, str]:
    """
    Retrieves the cutoff time for a meal slot from SystemConfig if available,
    falling back to standard institutional defaults.
    """
    if db:
        try:
            config = db.query(SystemConfig).filter(SystemConfig.key == "messaver_meal_cutoffs").first()
            if config and isinstance(config.value, dict):
                val_str = config.value.get(meal_type.value) or config.value.get(meal_type.name)
                if val_str:
                    parsed = _parse_time_string(val_str)
                    if parsed:
                        return parsed, str(val_str)
        except Exception:
            pass

    return DEFAULT_CUTOFF_TIMES[meal_type], DEFAULT_CUTOFF_STRINGS[meal_type]


def assert_attendance_cutoff_not_passed(
    meal_type: MealType,
    target_date_str: str,
    now: Optional[datetime] = None,
    db: Optional[Session] = None,
) -> None:
    """
    Asserts that the cutoff deadline for a specific meal slot and date has not passed.
    Raises HTTPException(400) if the cutoff has passed.
    """
    try:
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid date format: '{target_date_str}'. Expected YYYY-MM-DD.",
        )

    current_dt = now or datetime.now(timezone.utc)
    current_date = current_dt.date()

    # Past date check
    if target_date < current_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cutoff deadline for {target_date_str} has passed. Past attendance cannot be modified.",
        )

    # Future date check (open for advance opt-in / opt-out)
    if target_date > current_date:
        return

    # Today check
    cutoff_t, cutoff_str = get_cutoff_time(meal_type, db=db)
    current_time = current_dt.time()

    if current_time >= cutoff_t:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cutoff deadline for {meal_type.value} on {target_date_str} "
                f"({cutoff_str}) has passed. Attendance cannot be modified."
            ),
        )
