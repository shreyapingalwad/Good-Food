"""
Comprehensive automated tests for Phase 3.1:
- Student Meal Attendance API (POST /api/v1/attendance, GET /api/v1/attendance/me, GET /api/v1/attendance/summary)
- Meal and Dish Ratings API (POST /api/v1/ratings, GET /api/v1/ratings/me, GET /api/v1/ratings/summary)
- Anti-spoofing, CSRF enforcement, role/permission boundaries, cutoff enforcement, and concurrency.
"""
import concurrent.futures
from datetime import datetime, time, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.cutoff_service import assert_attendance_cutoff_not_passed
from app.core.database import get_db
from app.core.security import hash_secret
from app.models.attendance import StudentAttendance
from app.models.dish_rating import DishRating
from app.models.enums import MealType, UserRole
from app.models.user import User


# ── Fixtures & Test Helpers ──────────────────────────────────────────────────

@pytest.fixture
def setup_phase3_users(db_session: Session):
    """Seed test users for students, kitchen staff, managers, and admin."""
    users = [
        User(
            id="usr-std-001",
            username="student_alice",
            email="alice@campus.edu",
            full_name="Alice Sharma",
            password_hash=hash_secret("pass123"),
            role=UserRole.STUDENT,
            facility_id="FAC-NORTH",
        ),
        User(
            id="usr-std-002",
            username="student_bob",
            email="bob@campus.edu",
            full_name="Bob Patel",
            password_hash=hash_secret("pass123"),
            role=UserRole.STUDENT,
            facility_id="FAC-NORTH",
        ),
        User(
            id="usr-kit-001",
            username="chef_ramesh",
            email="ramesh@campus.edu",
            full_name="Chef Ramesh",
            password_hash=hash_secret("pass123"),
            role=UserRole.KITCHEN,
            facility_id="FAC-NORTH",
        ),
        User(
            id="usr-mgr-north",
            username="mgr_north",
            email="manager_north@campus.edu",
            full_name="Manager North",
            password_hash=hash_secret("pass123"),
            role=UserRole.MANAGER,
            facility_id="FAC-NORTH",
        ),
        User(
            id="usr-mgr-south",
            username="mgr_south",
            email="manager_south@campus.edu",
            full_name="Manager South",
            password_hash=hash_secret("pass123"),
            role=UserRole.MANAGER,
            facility_id="FAC-SOUTH",
        ),
        User(
            id="usr-adm-001",
            username="admin_super",
            email="admin@campus.edu",
            full_name="Super Admin",
            password_hash=hash_secret("pass123"),
            role=UserRole.ADMIN,
        ),
    ]
    for u in users:
        db_session.add(u)
    db_session.commit()
    return {u.username: u for u in users}


def authenticate_client(client: TestClient, identifier: str, password: str = "pass123") -> tuple[str, str]:
    """Logs in and returns (csrf_token, session_cookie_value)."""
    res = client.post("/api/v1/auth/login", json={"identifier": identifier, "password": password})
    assert res.status_code == 200
    csrf = res.json()["user"]["csrf_token"]
    cookie = res.cookies.get("messaver_session")
    return csrf, cookie


# ── 1. Attendance Authentication & CSRF Tests ────────────────────────────────

def test_attendance_unauthenticated_rejected(client: TestClient):
    """Unauthenticated requests are rejected with 401."""
    # POST attendance
    res_post = client.post(
        "/api/v1/attendance",
        json={"date": "2026-12-01", "meal_type": "Lunch", "attending": True},
    )
    assert res_post.status_code == 401

    # GET my attendance
    res_get = client.get("/api/v1/attendance/me")
    assert res_get.status_code == 401

    # GET attendance summary
    res_sum = client.get("/api/v1/attendance/summary")
    assert res_sum.status_code == 401


def test_attendance_post_requires_csrf(client: TestClient, setup_phase3_users):
    """State-changing POST /api/v1/attendance requires CSRF header."""
    csrf, cookie = authenticate_client(client, "student_alice")
    client.cookies.set("messaver_session", cookie)

    # Missing CSRF
    res_no_csrf = client.post(
        "/api/v1/attendance",
        json={"date": "2026-12-01", "meal_type": "Lunch", "attending": True},
    )
    assert res_no_csrf.status_code == 403
    assert "CSRF token missing" in res_no_csrf.json()["detail"]

    # Invalid CSRF
    res_bad_csrf = client.post(
        "/api/v1/attendance",
        headers={"X-CSRF-Token": "invalid-csrf-token"},
        json={"date": "2026-12-01", "meal_type": "Lunch", "attending": True},
    )
    assert res_bad_csrf.status_code == 403


# ── 2. Attendance Recording & Anti-Spoofing Tests ────────────────────────────

def test_attendance_record_success_and_anti_spoofing(client: TestClient, setup_phase3_users, db_session: Session):
    """
    Student submits attendance:
    - Server derives student_id strictly from session (attempts to pass student_id are ignored/prevented).
    - Database stores exact student identity.
    """
    csrf, cookie = authenticate_client(client, "student_alice")
    client.cookies.set("messaver_session", cookie)

    # Alice submits attendance for future date
    res = client.post(
        "/api/v1/attendance",
        headers={"X-CSRF-Token": csrf},
        json={
            "date": "2026-11-15",
            "meal_type": "Lunch",
            "attending": False,
            # Malicious attempt to spoof Bob's student ID
            "student_id": "usr-std-002",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == "usr-std-001"  # Alice, NOT Bob!
    assert data["student_name"] == "Alice Sharma"
    assert data["attending"] is False
    assert data["meal_type"] == "Lunch"

    # Verify DB state
    record = (
        db_session.query(StudentAttendance)
        .filter(StudentAttendance.student_id == "usr-std-001", StudentAttendance.date == "2026-11-15")
        .first()
    )
    assert record is not None
    assert record.attending is False


def test_attendance_date_and_meal_validation(client: TestClient, setup_phase3_users):
    """Invalid date format or non-existent calendar date is rejected with 422."""
    csrf, cookie = authenticate_client(client, "student_alice")
    client.cookies.set("messaver_session", cookie)

    # Malformed date string
    res_malformed = client.post(
        "/api/v1/attendance",
        headers={"X-CSRF-Token": csrf},
        json={"date": "15-11-2026", "meal_type": "Lunch", "attending": True},
    )
    assert res_malformed.status_code == 422

    # Non-existent calendar date (February 30)
    res_fake_date = client.post(
        "/api/v1/attendance",
        headers={"X-CSRF-Token": csrf},
        json={"date": "2026-02-30", "meal_type": "Lunch", "attending": True},
    )
    assert res_fake_date.status_code == 422

    # Invalid meal type
    res_bad_meal = client.post(
        "/api/v1/attendance",
        headers={"X-CSRF-Token": csrf},
        json={"date": "2026-11-15", "meal_type": "MidnightSnack", "attending": True},
    )
    assert res_bad_meal.status_code == 422


# ── 3. Attendance Cutoff Enforcement Tests ───────────────────────────────────

def test_attendance_cutoff_past_date_rejected(client: TestClient, setup_phase3_users):
    """Attempting to modify attendance for a past date is rejected with 400."""
    csrf, cookie = authenticate_client(client, "student_alice")
    client.cookies.set("messaver_session", cookie)

    res = client.post(
        "/api/v1/attendance",
        headers={"X-CSRF-Token": csrf},
        json={"date": "2020-01-01", "meal_type": "Lunch", "attending": True},
    )
    assert res.status_code == 400
    assert "cutoff" in res.json()["detail"].lower()


def test_attendance_cutoff_same_day_after_deadline(client: TestClient, setup_phase3_users):
    """When current time on the same date is after cutoff, submission is rejected."""
    csrf, cookie = authenticate_client(client, "student_alice")
    client.cookies.set("messaver_session", cookie)

    # Simulate Lunch on 2026-10-21 where simulated time is 11:35 AM (past 11:30 AM cutoff)
    simulated_now = datetime(2026, 10, 21, 11, 35, 0, tzinfo=timezone.utc)
    with patch("app.core.cutoff_service.datetime") as mock_dt:
        mock_dt.now.return_value = simulated_now
        mock_dt.strptime = datetime.strptime

        res = client.post(
            "/api/v1/attendance",
            headers={"X-CSRF-Token": csrf},
            json={"date": "2026-10-21", "meal_type": "Lunch", "attending": True},
        )
        assert res.status_code == 400
        assert "cutoff deadline for lunch" in res.json()["detail"].lower()


def test_attendance_cutoff_same_day_before_deadline(client: TestClient, setup_phase3_users):
    """When current time on the same date is before cutoff, submission succeeds."""
    csrf, cookie = authenticate_client(client, "student_alice")
    client.cookies.set("messaver_session", cookie)

    # Simulate Lunch on 2026-10-21 where simulated time is 10:15 AM (before 11:30 AM cutoff)
    simulated_now = datetime(2026, 10, 21, 10, 15, 0, tzinfo=timezone.utc)
    with patch("app.core.cutoff_service.datetime") as mock_dt:
        mock_dt.now.return_value = simulated_now
        mock_dt.strptime = datetime.strptime

        res = client.post(
            "/api/v1/attendance",
            headers={"X-CSRF-Token": csrf},
            json={"date": "2026-10-21", "meal_type": "Lunch", "attending": True},
        )
        assert res.status_code == 200
        assert res.json()["attending"] is True


# ── 4. Duplicate & Concurrent Attendance Submissions ─────────────────────────

def test_duplicate_attendance_submission_updates_cleanly(client: TestClient, setup_phase3_users, db_session: Session):
    """
    Submitting attendance twice for the same student, date, and meal slot updates
    the record without creating duplicate rows or integrity errors.
    """
    csrf, cookie = authenticate_client(client, "student_alice")
    client.cookies.set("messaver_session", cookie)

    # First submission: attending = False
    res1 = client.post(
        "/api/v1/attendance",
        headers={"X-CSRF-Token": csrf},
        json={"date": "2026-11-20", "meal_type": "Dinner", "attending": False},
    )
    assert res1.status_code == 200
    assert res1.json()["attending"] is False

    # Second submission: student changes mind, attending = True
    res2 = client.post(
        "/api/v1/attendance",
        headers={"X-CSRF-Token": csrf},
        json={"date": "2026-11-20", "meal_type": "Dinner", "attending": True},
    )
    assert res2.status_code == 200
    assert res2.json()["attending"] is True

    # Confirm exactly ONE record exists in DB
    records = (
        db_session.query(StudentAttendance)
        .filter(StudentAttendance.student_id == "usr-std-001", StudentAttendance.date == "2026-11-20")
        .all()
    )
    assert len(records) == 1
    assert records[0].attending is True


def test_concurrent_attendance_submissions(client: TestClient):
    """
    Concurrent requests submitting for the same student, date, and meal slot
    resolve deterministically without crashing or throwing database integrity errors.
    Uses an isolated file-backed SQLite database with timeout to enable true multi-connection concurrency.
    """
    import os
    import tempfile
    from app.core.database import Base

    db_path = os.path.join(tempfile.gettempdir(), f"messaver_test_conc_{int(datetime.now().timestamp() * 1000)}.db")
    conc_engine = create_engine(f"sqlite:///{db_path}", connect_args={"timeout": 30})
    Base.metadata.create_all(bind=conc_engine)
    ConcSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=conc_engine)

    # Seed Alice in this engine
    init_db = ConcSessionLocal()
    alice = User(
        id="usr-std-001",
        username="student_alice",
        email="alice@campus.edu",
        full_name="Alice Sharma",
        password_hash=hash_secret("pass123"),
        role=UserRole.STUDENT,
        facility_id="FAC-NORTH",
    )
    init_db.add(alice)
    init_db.commit()
    init_db.close()

    def thread_safe_get_db():
        s = ConcSessionLocal()
        try:
            yield s
        finally:
            s.close()

    orig_override = client.app.dependency_overrides.get(get_db)
    client.app.dependency_overrides[get_db] = thread_safe_get_db

    try:
        csrf, cookie = authenticate_client(client, "student_alice")

        def submit_req(attending: bool):
            c = TestClient(client.app)
            c.cookies.set("messaver_session", cookie)
            return c.post(
                "/api/v1/attendance",
                headers={"X-CSRF-Token": csrf},
                json={"date": "2026-11-25", "meal_type": "Breakfast", "attending": attending},
            )

        # Launch 6 concurrent threads alternating True/False
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
            futures = [executor.submit(submit_req, i % 2 == 0) for i in range(6)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        # All should return 200 OK
        for r in results:
            assert r.status_code == 200

        # Exactly 1 row in the database
        check_session = ConcSessionLocal()
        try:
            rows = (
                check_session.query(StudentAttendance)
                .filter(StudentAttendance.student_id == "usr-std-001", StudentAttendance.date == "2026-11-25")
                .all()
            )
            assert len(rows) == 1
        finally:
            check_session.close()
    finally:
        if orig_override:
            client.app.dependency_overrides[get_db] = orig_override
        else:
            client.app.dependency_overrides.pop(get_db, None)
        conc_engine.dispose()
        try:
            if os.path.exists(db_path):
                os.remove(db_path)
        except OSError:
            pass


# ── 5. Attendance History & Isolation Tests ──────────────────────────────────

def test_attendance_history_isolation(client: TestClient, setup_phase3_users, db_session: Session):
    """Student A can only view their own attendance history; Student B cannot see Student A's history."""
    # Seed records for Alice and Bob
    rec_alice = StudentAttendance(
        student_id="usr-std-001",
        student_name="Alice Sharma",
        date="2026-11-01",
        meal_type=MealType.LUNCH,
        attending=True,
    )
    rec_bob = StudentAttendance(
        student_id="usr-std-002",
        student_name="Bob Patel",
        date="2026-11-01",
        meal_type=MealType.LUNCH,
        attending=False,
    )
    db_session.add(rec_alice)
    db_session.add(rec_bob)
    db_session.commit()

    # Query Alice's history
    _, alice_cookie = authenticate_client(client, "student_alice")
    client.cookies.set("messaver_session", alice_cookie)
    res_a = client.get("/api/v1/attendance/me")
    assert res_a.status_code == 200
    items_a = res_a.json()["items"]
    assert len(items_a) == 1
    assert items_a[0]["student_id"] == "usr-std-001"

    # Query Bob's history
    _, bob_cookie = authenticate_client(client, "student_bob")
    client.cookies.set("messaver_session", bob_cookie)
    res_b = client.get("/api/v1/attendance/me")
    assert res_b.status_code == 200
    items_b = res_b.json()["items"]
    assert len(items_b) == 1
    assert items_b[0]["student_id"] == "usr-std-002"
    assert items_b[0]["attending"] is False


# ── 6. Facility Attendance Summary & Scoping Tests ───────────────────────────

def test_attendance_summary_role_and_facility_scoping(client: TestClient, setup_phase3_users, db_session: Session):
    """
    Attendance summary endpoint:
    - Students and Kitchen staff receive 403 Forbidden.
    - Manager North can query Facility North.
    - Manager North querying Facility South receives 403 Forbidden.
    - Admin can query any facility.
    """
    # 1. Student receives 403
    _, stu_cookie = authenticate_client(client, "student_alice")
    client.cookies.set("messaver_session", stu_cookie)
    res_stu = client.get("/api/v1/attendance/summary")
    assert res_stu.status_code == 403

    # 2. Kitchen staff receives 403
    _, kit_cookie = authenticate_client(client, "chef_ramesh")
    client.cookies.set("messaver_session", kit_cookie)
    res_kit = client.get("/api/v1/attendance/summary")
    assert res_kit.status_code == 403

    # 3. Manager North querying FAC-NORTH succeeds
    _, mgr_n_cookie = authenticate_client(client, "mgr_north")
    client.cookies.set("messaver_session", mgr_n_cookie)
    res_mgr_n = client.get("/api/v1/attendance/summary?facility_id=FAC-NORTH")
    assert res_mgr_n.status_code == 200
    assert res_mgr_n.json()["facility_id"] == "FAC-NORTH"
    assert len(res_mgr_n.json()["meals"]) == 4

    # 4. Manager North querying unauthorized facility FAC-SOUTH receives 403
    res_cross = client.get("/api/v1/attendance/summary?facility_id=FAC-SOUTH")
    assert res_cross.status_code == 403

    # 5. Admin can query FAC-SOUTH
    _, adm_cookie = authenticate_client(client, "admin_super")
    client.cookies.set("messaver_session", adm_cookie)
    res_adm = client.get("/api/v1/attendance/summary?facility_id=FAC-SOUTH")
    assert res_adm.status_code == 200
    assert res_adm.json()["facility_id"] == "FAC-SOUTH"


# ── 7. Meal Ratings API Tests ────────────────────────────────────────────────

def test_meal_ratings_unauthenticated_rejected(client: TestClient):
    """Unauthenticated access to meal ratings is rejected."""
    assert client.post("/api/v1/ratings", json={"dish_id": "m1", "dish_name": "Dal", "rating": 5}).status_code == 401
    assert client.get("/api/v1/ratings/me").status_code == 401
    assert client.get("/api/v1/ratings/summary").status_code == 401


def test_meal_rating_submission_and_anti_spoofing(client: TestClient, setup_phase3_users, db_session: Session):
    """Student submits rating; student identity is strictly derived from session."""
    csrf, cookie = authenticate_client(client, "student_alice")
    client.cookies.set("messaver_session", cookie)

    res = client.post(
        "/api/v1/ratings",
        headers={"X-CSRF-Token": csrf},
        json={
            "dish_id": "m1",
            "dish_name": "Dal Tadka",
            "rating": 5,
            "comment": "Perfect seasoning and aroma!",
            "student_id": "usr-std-002",  # Attempt to spoof Bob
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["dish_id"] == "m1"
    assert data["rating"] == 5
    assert data["student_id"] == "usr-std-001"  # Alice, NOT Bob!

    # Verify DB
    rating_db = db_session.query(DishRating).filter(DishRating.id == data["id"]).first()
    assert rating_db is not None
    assert rating_db.student_id == "usr-std-001"


def test_meal_rating_boundary_validation(client: TestClient, setup_phase3_users):
    """Rating must be between 1 and 5; invalid star ratings rejected with 422."""
    csrf, cookie = authenticate_client(client, "student_alice")
    client.cookies.set("messaver_session", cookie)

    # Rating 0 (below min)
    res_zero = client.post(
        "/api/v1/ratings",
        headers={"X-CSRF-Token": csrf},
        json={"dish_id": "m1", "dish_name": "Dal", "rating": 0},
    )
    assert res_zero.status_code == 422

    # Rating 6 (above max)
    res_six = client.post(
        "/api/v1/ratings",
        headers={"X-CSRF-Token": csrf},
        json={"dish_id": "m1", "dish_name": "Dal", "rating": 6},
    )
    assert res_six.status_code == 422

    # Empty dish_id
    res_empty_dish = client.post(
        "/api/v1/ratings",
        headers={"X-CSRF-Token": csrf},
        json={"dish_id": "", "dish_name": "Dal", "rating": 5},
    )
    assert res_empty_dish.status_code == 422


def test_meal_ratings_isolation(client: TestClient, setup_phase3_users, db_session: Session):
    """Student A can only retrieve their own ratings via /ratings/me."""
    # Alice rates m1, Bob rates m2
    r_alice = DishRating(dish_id="m1", dish_name="Dal", rating=5, student_id="usr-std-001")
    r_bob = DishRating(dish_id="m2", dish_name="Paneer", rating=4, student_id="usr-std-002")
    db_session.add(r_alice)
    db_session.add(r_bob)
    db_session.commit()

    # Alice queries /ratings/me
    _, a_cookie = authenticate_client(client, "student_alice")
    client.cookies.set("messaver_session", a_cookie)
    res_a = client.get("/api/v1/ratings/me")
    assert res_a.status_code == 200
    assert len(res_a.json()["items"]) == 1
    assert res_a.json()["items"][0]["dish_id"] == "m1"

    # Bob queries /ratings/me
    _, b_cookie = authenticate_client(client, "student_bob")
    client.cookies.set("messaver_session", b_cookie)
    res_b = client.get("/api/v1/ratings/me")
    assert res_b.status_code == 200
    assert len(res_b.json()["items"]) == 1
    assert res_b.json()["items"][0]["dish_id"] == "m2"


def test_meal_ratings_summary_authorization_and_aggregation(client: TestClient, setup_phase3_users, db_session: Session):
    """
    Ratings summary endpoint:
    - Students receive 403 Forbidden.
    - Kitchen, Manager, and Admin can view aggregated statistics.
    - Student identities are not exposed in anonymous comments.
    """
    # Seed multiple ratings for m1
    ratings = [
        DishRating(dish_id="m1", dish_name="Dal Tadka", rating=5, comment="Amazing dal!", student_id="usr-std-001"),
        DishRating(dish_id="m1", dish_name="Dal Tadka", rating=4, comment="Very good.", student_id="usr-std-002"),
        DishRating(dish_id="m2", dish_name="Paneer", rating=3, comment="A bit salty", student_id="usr-std-001"),
    ]
    for r in ratings:
        db_session.add(r)
    db_session.commit()

    # 1. Student receives 403
    _, stu_cookie = authenticate_client(client, "student_alice")
    client.cookies.set("messaver_session", stu_cookie)
    res_stu = client.get("/api/v1/ratings/summary")
    assert res_stu.status_code == 403

    # 2. Kitchen staff receives 200 and aggregated metrics
    _, kit_cookie = authenticate_client(client, "chef_ramesh")
    client.cookies.set("messaver_session", kit_cookie)
    res_kit = client.get("/api/v1/ratings/summary")
    assert res_kit.status_code == 200
    data = res_kit.json()
    assert data["total_dishes_rated"] == 2
    assert data["total_feedback_count"] == 3

    # Verify m1 summary
    m1_summary = next(s for s in data["summaries"] if s["dish_id"] == "m1")
    assert m1_summary["total_ratings"] == 2
    assert m1_summary["avg_rating"] == 4.5
    assert m1_summary["distribution"]["five_star"] == 1
    assert m1_summary["distribution"]["four_star"] == 1

    # Verify anonymous comments (no student_id in AnonymousComment)
    assert len(m1_summary["recent_comments"]) == 2
    for comment in m1_summary["recent_comments"]:
        assert "comment" in comment
        assert "rating" in comment
        assert "student_id" not in comment  # Privacy preserved!
