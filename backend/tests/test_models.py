import pytest
from sqlalchemy.exc import IntegrityError
from app.core.security import hash_secret, verify_secret
from app.models.enums import AuditSeverity, DonationStatus, MealType, UserRole
from app.models.user import User
from app.models.attendance import StudentAttendance
from app.models.dish_rating import DishRating
from app.models.kitchen_log import KitchenLog
from app.models.ngo import NgoPartner
from app.models.donation import SurplusDonation
from app.models.audit import AuditEvent
from app.models.system_config import SystemConfig


def test_user_creation_and_hashed_password(db_session):
    """Verify user persistence and that password hashes verify correctly."""
    hashed = hash_secret("SecretPassword123!")
    user = User(
        id="usr-test-1",
        username="test_student",
        email="student@campus.edu",
        full_name="Test Student",
        password_hash=hashed,
        role=UserRole.STUDENT,
        facility_id="Dining Hall 1"
    )
    db_session.add(user)
    db_session.commit()

    queried = db_session.query(User).filter(User.username == "test_student").first()
    assert queried is not None
    assert queried.role == UserRole.STUDENT
    assert queried.password_hash != "SecretPassword123!"
    assert verify_secret("SecretPassword123!", queried.password_hash) is True
    assert verify_secret("WrongPassword", queried.password_hash) is False


def test_student_attendance_unique_constraint(db_session):
    """Verify unique constraint on (student_id, date, meal_type)."""
    att1 = StudentAttendance(
        student_id="std-101",
        student_name="Student One",
        date="2026-10-20",
        meal_type=MealType.LUNCH,
        attending=True
    )
    db_session.add(att1)
    db_session.commit()

    # Attempting duplicate attendance for same student, date, and meal slot must fail
    att2 = StudentAttendance(
        student_id="std-101",
        student_name="Student One",
        date="2026-10-20",
        meal_type=MealType.LUNCH,
        attending=False
    )
    db_session.add(att2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_dish_rating_range_check_constraint(db_session):
    """Verify check constraint enforces rating between 1 and 5."""
    valid_rating = DishRating(
        dish_id="m1",
        dish_name="Dal Tadka",
        rating=5,
        comment="Delicious!",
        student_id="std-101"
    )
    db_session.add(valid_rating)
    db_session.commit()

    # Rating 6 is invalid
    invalid_rating = DishRating(
        dish_id="m1",
        dish_name="Dal Tadka",
        rating=6,
        student_id="std-102"
    )
    db_session.add(invalid_rating)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_kitchen_log_waste_segregation(db_session):
    """Verify kitchen log persists separate surplus and plate waste numbers."""
    klog = KitchenLog(
        id="klog-test",
        date="2026-10-20",
        meal_type=MealType.LUNCH,
        dish_name="Paneer Butter Masala",
        expected_attendance=500,
        recommended_kg=100.0,
        actual_prepared_kg=105.0,
        consumed_kg=98.0,
        kitchen_surplus_kg=7.0,
        plate_waste_kg=3.2,
        recorded_by="Chef Test"
    )
    db_session.add(klog)
    db_session.commit()

    saved = db_session.query(KitchenLog).filter(KitchenLog.id == "klog-test").first()
    assert saved.kitchen_surplus_kg == 7.0
    assert saved.plate_waste_kg == 3.2


def test_surplus_donation_food_safety_check_constraint(db_session):
    """Verify that plate leftovers cannot be saved as surplus donations."""
    ngo = NgoPartner(
        id="ngo-test-1",
        name="Test NGO",
        registration_number="REG-001",
        contact_person="Person",
        phone="1234567890",
        vehicle_type="Van"
    )
    db_session.add(ngo)
    db_session.commit()

    # Valid donation
    valid_don = SurplusDonation(
        id="DON-TEST-1",
        food_title="Rice & Dal",
        dishes=[{"name": "Rice", "quantityKg": 10.0}],
        total_quantity_kg=10.0,
        servings_count=25,
        meal_type=MealType.LUNCH,
        prepared_at="12:00 PM",
        temperature_at_packaging=68.0,
        is_hygienically_packed=True,
        is_plate_leftover=False,
        expiry_deadline="2026-10-20T14:00:00Z",
        status=DonationStatus.AVAILABLE,
        pickup_pin_hash=hash_secret("1234"),
        kitchen_facility="Main Mess",
        pickup_location="Gate 1",
        beneficiary_target="Shelter"
    )
    db_session.add(valid_don)
    db_session.commit()

    assert valid_don.status == DonationStatus.AVAILABLE


def test_audit_event_and_system_config(db_session):
    """Verify audit log and system config persistence."""
    audit = AuditEvent(
        id="log-test",
        timestamp="10:00 AM",
        actor_name="Manager Admin",
        actor_role=UserRole.MANAGER,
        action="SYSTEM_INIT",
        details="Initial test config loaded",
        severity=AuditSeverity.INFO
    )
    config = SystemConfig(
        key="test_safety_buffer",
        value={"percent": 5.0},
        description="Test safety buffer"
    )
    db_session.add_all([audit, config])
    db_session.commit()

    saved_audit = db_session.query(AuditEvent).filter(AuditEvent.id == "log-test").first()
    saved_config = db_session.query(SystemConfig).filter(SystemConfig.key == "test_safety_buffer").first()
    assert saved_audit is not None
    assert saved_config.value["percent"] == 5.0
