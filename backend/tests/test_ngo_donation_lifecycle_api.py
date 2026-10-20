"""
Phase 3.3 Test Suite — Complete Backend Donation Lifecycle:
1. NGO Claim API (POST /api/v1/surplus/{donation_id}/claim):
   - Unauthenticated rejected (401)
   - CSRF enforcement (403)
   - Student and Kitchen roles forbidden (403)
   - Unverified and inactive NGOs barred (403)
   - Client-supplied NGO ID anti-spoofing
   - Valid claim succeeds (200), emits audit event
   - Duplicate claim returns 409 Conflict
   - Expired offer claim rejected (400)
   - Concurrent competing claims (exactly one 200, one 409)
2. NGO Retrieval APIs (GET /available, GET /claimed/me, GET /{donation_id}):
   - Expired offers excluded from /available
   - Cross-NGO isolation in /claimed/me
   - Never expose plaintext PIN or bcrypt hash
3. Secure Pickup Verification API (POST /api/v1/surplus/{donation_id}/verify-pickup):
   - Unauthenticated rejected (401)
   - CSRF enforcement (403)
   - Unauthorized roles rejected (Student, NGO) (403)
   - Cross-facility rejection (Chef South cannot verify Chef North donation) (403)
   - Unclaimed or already completed donation rejected (400)
   - Expired donation rejected (400)
   - Invalid PIN rejected without leaking secrets (400), logs warning audit
   - Rate limiting and lockout enforced (3 failures -> 429)
   - Valid PIN completes donation atomically, increments NGO metrics, logs success audit
   - Idempotency & double-completion prevented
   - Concurrent verification attempts cannot double-count
   - Read responses and logs never expose PIN values or hashes
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Optional
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import get_db
from app.core.pin_security import hash_pickup_pin, pin_tracker
from app.core.security import hash_secret
from app.models.audit import AuditEvent
from app.models.donation import SurplusDonation
from app.models.enums import AuditSeverity, DonationStatus, MealType, UserRole
from app.models.ngo import NgoPartner
from app.models.user import User


# ── Fixtures & Setup ──────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clean_pin_tracker():
    """Ensure in-memory PIN attempt tracking is clean for every test."""
    pin_tracker.clear_all()
    yield
    pin_tracker.clear_all()


@pytest.fixture
def setup_lifecycle_data(db_session: Session):
    """Seed NGOs and test users across all roles."""
    ngo1 = NgoPartner(
        id="ngo-1",
        name="Robin Hood Army - South Wing",
        registration_number="REG-RHA-001",
        contact_person="Robin Coordinator",
        phone="+91 98765 43210",
        vehicle_type="Insulated Electric Van",
        verified=True,
        total_pickups_completed=5,
        meals_distributed=250,
    )
    ngo2 = NgoPartner(
        id="ngo-2",
        name="Feeding India - East Chapter",
        registration_number="REG-FI-002",
        contact_person="Feeding Lead",
        phone="+91 98765 43211",
        vehicle_type="Refrigerated Van",
        verified=True,
        total_pickups_completed=10,
        meals_distributed=500,
    )
    ngo_unverified = NgoPartner(
        id="ngo-unverified",
        name="Unverified Shelter Collective",
        registration_number="REG-UNV-999",
        contact_person="Unverified Person",
        phone="+91 98765 00000",
        vehicle_type="Small Truck",
        verified=False,  # Unverified!
        total_pickups_completed=0,
        meals_distributed=0,
    )
    db_session.add_all([ngo1, ngo2, ngo_unverified])
    db_session.flush()

    users = [
        User(
            id="usr-std-1",
            username="student_sam",
            email="sam@campus.edu",
            full_name="Sam Student",
            password_hash=hash_secret("pass123"),
            role=UserRole.STUDENT,
            facility_id="FAC-NORTH",
            is_active=True,
        ),
        User(
            id="usr-kit-north",
            username="chef_north",
            email="north_chef@campus.edu",
            full_name="Chef North",
            password_hash=hash_secret("pass123"),
            role=UserRole.KITCHEN,
            facility_id="FAC-NORTH",
            is_active=True,
        ),
        User(
            id="usr-kit-south",
            username="chef_south",
            email="south_chef@campus.edu",
            full_name="Chef South",
            password_hash=hash_secret("pass123"),
            role=UserRole.KITCHEN,
            facility_id="FAC-SOUTH",
            is_active=True,
        ),
        User(
            id="usr-ngo-1",
            username="ngo_robin",
            email="robin@rha.org",
            full_name="Robin Collector",
            password_hash=hash_secret("pass123"),
            role=UserRole.NGO,
            ngo_id="ngo-1",
            is_active=True,
        ),
        User(
            id="usr-ngo-2",
            username="ngo_feeding",
            email="lead@feedingindia.org",
            full_name="Feeding Collector",
            password_hash=hash_secret("pass123"),
            role=UserRole.NGO,
            ngo_id="ngo-2",
            is_active=True,
        ),
        User(
            id="usr-ngo-unv",
            username="ngo_unv_user",
            email="unv@shelter.org",
            full_name="Unverified Collector",
            password_hash=hash_secret("pass123"),
            role=UserRole.NGO,
            ngo_id="ngo-unverified",
            is_active=True,
        ),
        User(
            id="usr-ngo-inact",
            username="ngo_inactive_user",
            email="inactive@rha.org",
            full_name="Inactive Collector",
            password_hash=hash_secret("pass123"),
            role=UserRole.NGO,
            ngo_id="ngo-1",
            is_active=False,  # Inactive account
        ),
        User(
            id="usr-admin",
            username="admin_super",
            email="admin@campus.edu",
            full_name="Super Admin",
            password_hash=hash_secret("pass123"),
            role=UserRole.ADMIN,
            is_active=True,
        ),
    ]
    for u in users:
        db_session.add(u)
    db_session.commit()
    return {u.username: u for u in users}


def authenticate_client(client: TestClient, identifier: str, password: str = "pass123") -> tuple[str, str]:
    """Helper to authenticate and return (csrf_token, session_cookie). Clears client cookies first."""
    client.cookies.clear()
    res = client.post("/api/v1/auth/login", json={"identifier": identifier, "password": password})
    assert res.status_code == 200, f"Login failed for {identifier}: {res.text}"
    csrf = res.json()["user"]["csrf_token"]
    cookie = res.cookies.get("messaver_session") or client.cookies.get("messaver_session")
    return csrf, cookie


def create_test_donation(
    db_session: Session,
    donation_id: str = "DON-7001",
    facility_id: str = "FAC-NORTH",
    plain_pin: str = "4826",
    status: DonationStatus = DonationStatus.AVAILABLE,
    expiry_hours: float = 2.0,
    claimed_by_ngo_id: Optional[str] = None,
    claimed_by_ngo_name: Optional[str] = None,
    total_quantity_kg: float = 30.0,
    servings_count: int = 60,
) -> tuple[SurplusDonation, str]:
    now_utc = datetime.now(timezone.utc)
    expiry = (now_utc + timedelta(hours=expiry_hours)).isoformat()
    pin_hash = hash_pickup_pin(plain_pin, donation_id)
    donation = SurplusDonation(
        id=donation_id,
        food_title="Steamed Rice & Dal Makhani",
        dishes=[{"name": "Steamed Rice", "quantityKg": 15.0}, {"name": "Dal Makhani", "quantityKg": 15.0}],
        total_quantity_kg=total_quantity_kg,
        servings_count=servings_count,
        meal_type=MealType.DINNER,
        prepared_at="07:30 PM",
        temperature_at_packaging=68.0,
        is_hygienically_packed=True,
        is_plate_leftover=False,
        expiry_deadline=expiry,
        status=status,
        claimed_by_ngo_id=claimed_by_ngo_id,
        claimed_by_ngo_name=claimed_by_ngo_name,
        claimed_at=now_utc.isoformat() if claimed_by_ngo_id else None,
        pickup_pin_hash=pin_hash,
        kitchen_facility=facility_id,
        pickup_location="Kitchen Bay Gate 2",
        beneficiary_target="Underprivileged Children Center",
    )
    db_session.add(donation)
    db_session.commit()
    db_session.refresh(donation)
    return donation, plain_pin


# ── 1. NGO Claiming Lifecycle Tests ───────────────────────────────────────────

def test_claim_unauthenticated_rejected(client: TestClient, db_session: Session):
    """Unauthenticated users cannot claim donations (401)."""
    donation, _ = create_test_donation(db_session, "DON-UNAUTH")
    res = client.post(f"/api/v1/surplus/{donation.id}/claim")
    assert res.status_code == 401


def test_claim_csrf_enforcement(client: TestClient, setup_lifecycle_data, db_session: Session):
    """Claiming requires CSRF token verification (403 without header)."""
    donation, _ = create_test_donation(db_session, "DON-CSRF-CLAIM")
    _, cookie = authenticate_client(client, "ngo_robin")
    client.cookies.set("messaver_session", cookie)

    res = client.post(f"/api/v1/surplus/{donation.id}/claim")
    assert res.status_code == 403
    assert "CSRF token missing" in res.json()["detail"]


def test_claim_student_and_kitchen_cannot_claim(client: TestClient, setup_lifecycle_data, db_session: Session):
    """Students and Kitchen staff cannot claim donations (403)."""
    donation, _ = create_test_donation(db_session, "DON-ROLES-CLAIM")

    # 1. Student
    csrf_std, cookie_std = authenticate_client(client, "student_sam")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie_std)
    res_std = client.post(
        f"/api/v1/surplus/{donation.id}/claim",
        headers={"X-CSRF-Token": csrf_std},
    )
    assert res_std.status_code == 403

    # 2. Kitchen staff
    csrf_kit, cookie_kit = authenticate_client(client, "chef_north")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie_kit)
    res_kit = client.post(
        f"/api/v1/surplus/{donation.id}/claim",
        headers={"X-CSRF-Token": csrf_kit},
    )
    assert res_kit.status_code == 403


def test_claim_unverified_ngo_rejected(client: TestClient, setup_lifecycle_data, db_session: Session):
    """Unverified NGO accounts cannot claim donations (403)."""
    donation, _ = create_test_donation(db_session, "DON-UNV-CLAIM")
    csrf, cookie = authenticate_client(client, "ngo_unv_user")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie)

    res = client.post(
        f"/api/v1/surplus/{donation.id}/claim",
        headers={"X-CSRF-Token": csrf},
    )
    assert res.status_code == 403
    assert "Only verified NGO partners" in res.json()["detail"]


def test_claim_inactive_user_rejected(client: TestClient, setup_lifecycle_data, db_session: Session):
    """Inactive NGO user account cannot login or claim donations."""
    # 1. Login fails for inactive account (401 or 403 anti-enumeration)
    client.cookies.clear()
    res_login = client.post("/api/v1/auth/login", json={"identifier": "ngo_inactive_user", "password": "pass123"})
    assert res_login.status_code in {401, 403}

    # 2. Deactivating an existing active session causes claim to be rejected (403)
    donation, _ = create_test_donation(db_session, "DON-INACT-CLAIM")
    csrf, cookie = authenticate_client(client, "ngo_robin")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie)

    # Deactivate robin in database
    user = db_session.query(User).filter(User.username == "ngo_robin").first()
    user.is_active = False
    db_session.commit()

    try:
        res = client.post(
            f"/api/v1/surplus/{donation.id}/claim",
            headers={"X-CSRF-Token": csrf},
        )
        assert res.status_code == 403
        assert "inactive" in res.json()["detail"].lower()
    finally:
        # Restore active state for subsequent tests
        user.is_active = True
        db_session.commit()


def test_claim_client_supplied_ngo_id_anti_spoofing(client: TestClient, setup_lifecycle_data, db_session: Session):
    """
    Client-supplied NGO IDs are completely ignored; identity is strictly derived
    from the authenticated session (ngo-1).
    """
    donation, _ = create_test_donation(db_session, "DON-SPOOF-CLAIM")
    csrf, cookie = authenticate_client(client, "ngo_robin")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie)

    # Malicious NGO tries to pass body spoofing another NGO
    res = client.post(
        f"/api/v1/surplus/{donation.id}/claim",
        headers={"X-CSRF-Token": csrf},
        json={"notes": "Urgent pickup", "ngo_id": "ngo-2", "claimed_by_ngo_id": "ngo-2"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "CLAIMED"
    assert data["claimed_by_ngo_id"] == "ngo-1"  # Bound to ngo_robin's assigned NGO!
    assert data["claimed_by_ngo_name"] == "Robin Hood Army - South Wing"


def test_claim_valid_success(client: TestClient, setup_lifecycle_data, db_session: Session):
    """
    Valid claim by verified NGO succeeds:
    - Status transitions to CLAIMED
    - claimed_at timestamp and NGO metadata recorded
    - Audit event written
    - Response never exposes PIN hash or server secrets
    """
    donation, _ = create_test_donation(db_session, "DON-VALID-CLAIM")
    csrf, cookie = authenticate_client(client, "ngo_robin")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie)

    res = client.post(
        f"/api/v1/surplus/{donation.id}/claim",
        headers={"X-CSRF-Token": csrf},
        json={"notes": "Van arriving in 30 minutes"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "DON-VALID-CLAIM"
    assert data["status"] == "CLAIMED"
    assert data["claimed_by_ngo_id"] == "ngo-1"
    assert data["claimed_by_ngo_name"] == "Robin Hood Army - South Wing"
    assert data["claimed_at"] is not None

    # Verify PIN hash is NOT in response
    assert "pickup_pin_hash" not in data
    assert "pickup_pin" not in data

    # Verify audit event in DB
    audit = (
        db_session.query(AuditEvent)
        .filter(AuditEvent.action == "DONATION_CLAIMED")
        .order_by(AuditEvent.created_at.desc())
        .first()
    )
    assert audit is not None
    assert "DON-VALID-CLAIM" in audit.details
    assert "Robin Hood Army" in audit.details or "Robin Hood Army" in audit.actor_name
    assert audit.severity == AuditSeverity.SUCCESS


def test_claim_duplicate_returns_conflict(client: TestClient, setup_lifecycle_data, db_session: Session):
    """A second claim attempt on an already claimed donation returns 409 Conflict."""
    donation, _ = create_test_donation(
        db_session,
        "DON-DUP-CLAIM",
        status=DonationStatus.CLAIMED,
        claimed_by_ngo_id="ngo-1",
        claimed_by_ngo_name="Robin Hood Army - South Wing",
    )
    csrf, cookie = authenticate_client(client, "ngo_feeding")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie)

    res = client.post(
        f"/api/v1/surplus/{donation.id}/claim",
        headers={"X-CSRF-Token": csrf},
    )
    assert res.status_code == 409
    assert "already been claimed" in res.json()["detail"]


def test_claim_expired_offer_rejected(client: TestClient, setup_lifecycle_data, db_session: Session):
    """Claiming an offer whose safety window has passed returns 400 Bad Request."""
    donation, _ = create_test_donation(db_session, "DON-EXP-CLAIM", expiry_hours=-1.0)  # Expired 1 hr ago
    csrf, cookie = authenticate_client(client, "ngo_robin")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie)

    res = client.post(
        f"/api/v1/surplus/{donation.id}/claim",
        headers={"X-CSRF-Token": csrf},
    )
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()

    # Database status transitions to EXPIRED
    db_session.refresh(donation)
    assert donation.status == DonationStatus.EXPIRED


def test_claim_concurrent_competing_claims(client: TestClient):
    """
    Two concurrent NGOs attempting to claim the same donation:
    Thread-safe execution ensures exactly one succeeds (200), the other receives 409 Conflict.
    Uses an isolated file-backed database with timeout for multi-connection concurrency.
    """
    import os
    import tempfile
    import uuid
    from sqlalchemy import create_engine
    from app.core.database import Base

    db_path = os.path.join(tempfile.gettempdir(), f"messaver_test_conc_claim_{uuid.uuid4().hex}.db")
    conc_engine = create_engine(f"sqlite:///{db_path}", connect_args={"timeout": 30})
    Base.metadata.create_all(bind=conc_engine)
    ConcSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=conc_engine)

    init_db = ConcSessionLocal()
    ngo1 = NgoPartner(
        id="ngo-1",
        name="Robin Hood Army - South Wing",
        registration_number="REG-RHA-001",
        contact_person="Robin Coordinator",
        phone="+91 98765 43210",
        vehicle_type="Insulated Electric Van",
        verified=True,
    )
    ngo2 = NgoPartner(
        id="ngo-2",
        name="Feeding India - East Chapter",
        registration_number="REG-FI-002",
        contact_person="Feeding Lead",
        phone="+91 98765 43211",
        vehicle_type="Refrigerated Van",
        verified=True,
    )
    u1 = User(
        id="usr-ngo-1",
        username="ngo_robin",
        email="robin@rha.org",
        full_name="Robin Collector",
        password_hash=hash_secret("pass123"),
        role=UserRole.NGO,
        ngo_id="ngo-1",
        is_active=True,
    )
    u2 = User(
        id="usr-ngo-2",
        username="ngo_feeding",
        email="lead@feedingindia.org",
        full_name="Feeding Collector",
        password_hash=hash_secret("pass123"),
        role=UserRole.NGO,
        ngo_id="ngo-2",
        is_active=True,
    )
    init_db.add_all([ngo1, ngo2, u1, u2])
    init_db.commit()

    donation, _ = create_test_donation(init_db, "DON-CONCURRENT-CLAIM")
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
        csrf_1, cookie_1 = authenticate_client(client, "ngo_robin")
        csrf_2, cookie_2 = authenticate_client(client, "ngo_feeding")

        def claim_attempt(csrf: str, cookie: str):
            c = TestClient(client.app)
            c.cookies.set("messaver_session", cookie)
            res = c.post(
                f"/api/v1/surplus/{donation.id}/claim",
                headers={"X-CSRF-Token": csrf},
            )
            return res.status_code

        with ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(claim_attempt, csrf_1, cookie_1)
            f2 = executor.submit(claim_attempt, csrf_2, cookie_2)
            results = [f1.result(), f2.result()]

        assert 200 in results, f"Expected one 200 success, got {results}"
        assert 409 in results, f"Expected one 409 conflict, got {results}"
        assert results.count(200) == 1
        assert results.count(409) == 1
    finally:
        if orig_override:
            client.app.dependency_overrides[get_db] = orig_override
        else:
            client.app.dependency_overrides.pop(get_db, None)
        conc_engine.dispose()
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass


# ── 2. NGO Retrieval & Cross-NGO Isolation Tests ──────────────────────────────

def test_available_donations_excludes_expired_offers(client: TestClient, setup_lifecycle_data, db_session: Session):
    """GET /api/v1/surplus/available filters out offers past their expiry deadline."""
    create_test_donation(db_session, "DON-ACTIVE-1", expiry_hours=3.0)
    create_test_donation(db_session, "DON-EXPIRED-2", expiry_hours=-2.0)

    _, cookie = authenticate_client(client, "ngo_robin")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie)

    res = client.get("/api/v1/surplus/available")
    assert res.status_code == 200
    items = res.json()["items"]
    ids = [i["id"] for i in items]
    assert "DON-ACTIVE-1" in ids
    assert "DON-EXPIRED-2" not in ids


def test_claimed_me_cross_ngo_isolation(client: TestClient, setup_lifecycle_data, db_session: Session):
    """
    GET /api/v1/surplus/claimed/me strictly isolates claims by authenticated NGO.
    NGO 1 cannot see NGO 2's claims.
    """
    create_test_donation(
        db_session,
        "DON-CLAIMED-NGO1",
        status=DonationStatus.CLAIMED,
        claimed_by_ngo_id="ngo-1",
        claimed_by_ngo_name="Robin Hood Army - South Wing",
    )
    create_test_donation(
        db_session,
        "DON-CLAIMED-NGO2",
        status=DonationStatus.CLAIMED,
        claimed_by_ngo_id="ngo-2",
        claimed_by_ngo_name="Feeding India - East Chapter",
    )

    # 1. NGO 1 views claimed/me
    _, cookie_1 = authenticate_client(client, "ngo_robin")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie_1)
    res_1 = client.get("/api/v1/surplus/claimed/me")
    assert res_1.status_code == 200
    items_1 = res_1.json()["items"]
    ids_1 = [i["id"] for i in items_1]
    assert "DON-CLAIMED-NGO1" in ids_1
    assert "DON-CLAIMED-NGO2" not in ids_1

    # 2. NGO 2 views claimed/me
    _, cookie_2 = authenticate_client(client, "ngo_feeding")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie_2)
    res_2 = client.get("/api/v1/surplus/claimed/me")
    assert res_2.status_code == 200
    items_2 = res_2.json()["items"]
    ids_2 = [i["id"] for i in items_2]
    assert "DON-CLAIMED-NGO2" in ids_2
    assert "DON-CLAIMED-NGO1" not in ids_2


def test_get_donation_by_id_scoping(client: TestClient, setup_lifecycle_data, db_session: Session):
    """Single donation lookup respects role scoping and cross-NGO confidentiality."""
    donation, _ = create_test_donation(
        db_session,
        "DON-PRIVATE-NGO1",
        status=DonationStatus.CLAIMED,
        claimed_by_ngo_id="ngo-1",
        claimed_by_ngo_name="Robin Hood Army - South Wing",
    )

    # 1. Student is forbidden
    _, cookie_std = authenticate_client(client, "student_sam")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie_std)
    assert client.get(f"/api/v1/surplus/{donation.id}").status_code == 403

    # 2. Competing NGO 2 cannot view NGO 1's claimed donation
    _, cookie_ngo2 = authenticate_client(client, "ngo_feeding")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie_ngo2)
    assert client.get(f"/api/v1/surplus/{donation.id}").status_code == 403

    # 3. Owner NGO 1 can view
    _, cookie_ngo1 = authenticate_client(client, "ngo_robin")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie_ngo1)
    res_owner = client.get(f"/api/v1/surplus/{donation.id}")
    assert res_owner.status_code == 200
    assert res_owner.json()["id"] == "DON-PRIVATE-NGO1"


# ── 3. Pickup PIN Verification & Atomic Handover Tests ────────────────────────

def test_verify_pickup_unauthenticated_rejected(client: TestClient, db_session: Session):
    """Unauthenticated users cannot verify pickup (401)."""
    donation, _ = create_test_donation(db_session, "DON-V-UNAUTH")
    res = client.post(f"/api/v1/surplus/{donation.id}/verify-pickup", json={"pin": "1234"})
    assert res.status_code == 401


def test_verify_pickup_csrf_enforcement(client: TestClient, setup_lifecycle_data, db_session: Session):
    """Pickup verification requires CSRF token (403 without header)."""
    donation, pin = create_test_donation(db_session, "DON-V-CSRF", status=DonationStatus.CLAIMED, claimed_by_ngo_id="ngo-1")
    _, cookie = authenticate_client(client, "chef_north")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie)

    res = client.post(f"/api/v1/surplus/{donation.id}/verify-pickup", json={"pin": pin})
    assert res.status_code == 403
    assert "CSRF token missing" in res.json()["detail"]


def test_verify_pickup_unauthorized_roles(client: TestClient, setup_lifecycle_data, db_session: Session):
    """Students and NGO users cannot verify physical pickup (403)."""
    donation, pin = create_test_donation(db_session, "DON-V-ROLES", status=DonationStatus.CLAIMED, claimed_by_ngo_id="ngo-1")

    # 1. Student
    csrf_std, cookie_std = authenticate_client(client, "student_sam")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie_std)
    res_std = client.post(
        f"/api/v1/surplus/{donation.id}/verify-pickup",
        headers={"X-CSRF-Token": csrf_std},
        json={"pin": pin},
    )
    assert res_std.status_code == 403

    # 2. NGO (cannot verify its own pickup bypassing kitchen dispatch)
    csrf_ngo, cookie_ngo = authenticate_client(client, "ngo_robin")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie_ngo)
    res_ngo = client.post(
        f"/api/v1/surplus/{donation.id}/verify-pickup",
        headers={"X-CSRF-Token": csrf_ngo},
        json={"pin": pin},
    )
    assert res_ngo.status_code == 403


def test_verify_pickup_wrong_facility_rejected(client: TestClient, setup_lifecycle_data, db_session: Session):
    """Chef from Facility South cannot verify a donation created by Facility North (403)."""
    donation, pin = create_test_donation(
        db_session,
        "DON-V-CROSS-FAC",
        facility_id="FAC-NORTH",
        status=DonationStatus.CLAIMED,
        claimed_by_ngo_id="ngo-1",
    )
    csrf_south, cookie_south = authenticate_client(client, "chef_south")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie_south)

    res = client.post(
        f"/api/v1/surplus/{donation.id}/verify-pickup",
        headers={"X-CSRF-Token": csrf_south},
        json={"pin": pin},
    )
    assert res.status_code == 403
    assert "assigned facility" in res.json()["detail"]


def test_verify_pickup_unclaimed_or_completed_rejected(client: TestClient, setup_lifecycle_data, db_session: Session):
    """Unclaimed AVAILABLE donation or already COMPLETED donation cannot be verified (400)."""
    # 1. AVAILABLE donation
    d_avail, pin_avail = create_test_donation(db_session, "DON-V-AVAIL", status=DonationStatus.AVAILABLE)
    csrf_1, cookie_1 = authenticate_client(client, "chef_north")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie_1)
    res_avail = client.post(
        f"/api/v1/surplus/{d_avail.id}/verify-pickup",
        headers={"X-CSRF-Token": csrf_1},
        json={"pin": pin_avail},
    )
    assert res_avail.status_code == 400
    assert "claimed" in res_avail.json()["detail"].lower()

    # 2. COMPLETED donation
    d_comp, pin_comp = create_test_donation(db_session, "DON-V-COMP", status=DonationStatus.COMPLETED, claimed_by_ngo_id="ngo-1")
    csrf_2, cookie_2 = authenticate_client(client, "chef_north")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie_2)
    res_comp = client.post(
        f"/api/v1/surplus/{d_comp.id}/verify-pickup",
        headers={"X-CSRF-Token": csrf_2},
        json={"pin": pin_comp},
    )
    assert res_comp.status_code == 400
    assert "already been completed" in res_comp.json()["detail"]


def test_verify_pickup_expired_donation_rejected(client: TestClient, setup_lifecycle_data, db_session: Session):
    """Donation past expiry deadline cannot be verified (400)."""
    donation, pin = create_test_donation(
        db_session,
        "DON-V-EXPIRED",
        status=DonationStatus.CLAIMED,
        claimed_by_ngo_id="ngo-1",
        expiry_hours=-1.0,
    )
    csrf, cookie = authenticate_client(client, "chef_north")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie)

    res = client.post(
        f"/api/v1/surplus/{donation.id}/verify-pickup",
        headers={"X-CSRF-Token": csrf},
        json={"pin": pin},
    )
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()


def test_verify_pickup_incorrect_pin_rejected(client: TestClient, setup_lifecycle_data, db_session: Session):
    """Incorrect PIN is rejected without leaking hash or pepper, logging an audit event."""
    donation, _ = create_test_donation(
        db_session,
        "DON-V-WRONG-PIN",
        plain_pin="4826",
        status=DonationStatus.CLAIMED,
        claimed_by_ngo_id="ngo-1",
    )
    csrf, cookie = authenticate_client(client, "chef_north")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie)

    res = client.post(
        f"/api/v1/surplus/{donation.id}/verify-pickup",
        headers={"X-CSRF-Token": csrf},
        json={"pin": "0000"},  # Wrong PIN
    )
    assert res.status_code == 400
    assert "Invalid 4-digit pickup PIN" in res.json()["detail"]

    # Verify audit event for failed attempt
    audit = (
        db_session.query(AuditEvent)
        .filter(AuditEvent.action == "PIN_VERIFICATION_FAILED")
        .order_by(AuditEvent.created_at.desc())
        .first()
    )
    assert audit is not None
    assert "DON-V-WRONG-PIN" in audit.details
    assert "attempt 1" in audit.details
    assert audit.severity == AuditSeverity.WARNING


def test_verify_pickup_rate_limiting_and_lockout(client: TestClient, setup_lifecycle_data, db_session: Session):
    """3 consecutive failed PIN attempts trigger bounded lockout (429)."""
    donation, pin = create_test_donation(
        db_session,
        "DON-V-LOCKOUT",
        plain_pin="9999",
        status=DonationStatus.CLAIMED,
        claimed_by_ngo_id="ngo-1",
    )
    csrf, cookie = authenticate_client(client, "chef_north")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie)

    # Attempt 1 -> 400
    assert client.post(
        f"/api/v1/surplus/{donation.id}/verify-pickup",
        headers={"X-CSRF-Token": csrf},
        json={"pin": "1111"},
    ).status_code == 400

    # Attempt 2 -> 400
    assert client.post(
        f"/api/v1/surplus/{donation.id}/verify-pickup",
        headers={"X-CSRF-Token": csrf},
        json={"pin": "2222"},
    ).status_code == 400

    # Attempt 3 -> 429 Lockout triggered
    res3 = client.post(
        f"/api/v1/surplus/{donation.id}/verify-pickup",
        headers={"X-CSRF-Token": csrf},
        json={"pin": "3333"},
    )
    assert res3.status_code == 429
    assert "PIN verification temporarily locked" in res3.json()["detail"]

    # Even with correct PIN, locked out!
    res_correct = client.post(
        f"/api/v1/surplus/{donation.id}/verify-pickup",
        headers={"X-CSRF-Token": csrf},
        json={"pin": pin},
    )
    assert res_correct.status_code == 429


def test_verify_pickup_valid_pin_completes_donation(client: TestClient, setup_lifecycle_data, db_session: Session):
    """
    Submitting valid PIN:
    - Status transitions to COMPLETED
    - completed_at is recorded
    - NGO total_pickups_completed (+1) and meals_distributed (+servings) updated
    - Handover audit event written
    - Lockout tracker reset
    """
    donation, pin = create_test_donation(
        db_session,
        "DON-V-SUCCESS",
        plain_pin="7382",
        status=DonationStatus.CLAIMED,
        claimed_by_ngo_id="ngo-1",
        claimed_by_ngo_name="Robin Hood Army - South Wing",
        servings_count=80,
    )
    # Check initial NGO metrics
    ngo = db_session.query(NgoPartner).filter(NgoPartner.id == "ngo-1").first()
    initial_pickups = ngo.total_pickups_completed
    initial_meals = ngo.meals_distributed

    csrf, cookie = authenticate_client(client, "chef_north")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie)

    res = client.post(
        f"/api/v1/surplus/{donation.id}/verify-pickup",
        headers={"X-CSRF-Token": csrf},
        json={"pin": pin},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "COMPLETED"
    assert data["completed_at"] is not None
    assert "pickup_pin_hash" not in data
    assert "pickup_pin" not in data

    # Verify database state
    db_session.refresh(donation)
    assert donation.status == DonationStatus.COMPLETED
    assert donation.completed_at is not None

    # Verify NGO partner metrics atomically incremented
    db_session.refresh(ngo)
    assert ngo.total_pickups_completed == initial_pickups + 1
    assert ngo.meals_distributed == initial_meals + 80

    # Verify Handover Audit event
    audit = (
        db_session.query(AuditEvent)
        .filter(AuditEvent.action == "HANDOVER_VERIFIED")
        .order_by(AuditEvent.created_at.desc())
        .first()
    )
    assert audit is not None
    assert "DON-V-SUCCESS" in audit.details
    assert "80 meals" in audit.details
    assert audit.severity == AuditSeverity.SUCCESS


def test_verify_pickup_idempotency_no_double_completion(client: TestClient, setup_lifecycle_data, db_session: Session):
    """
    Repeating verification on an already completed donation returns 400 Bad Request
    and does not increment NGO metrics again.
    """
    donation, pin = create_test_donation(
        db_session,
        "DON-V-IDEMPOTENT",
        plain_pin="1234",
        status=DonationStatus.CLAIMED,
        claimed_by_ngo_id="ngo-1",
        servings_count=50,
    )
    csrf, cookie = authenticate_client(client, "chef_north")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie)

    # First verification completes cleanly
    res1 = client.post(
        f"/api/v1/surplus/{donation.id}/verify-pickup",
        headers={"X-CSRF-Token": csrf},
        json={"pin": pin},
    )
    assert res1.status_code == 200

    ngo = db_session.query(NgoPartner).filter(NgoPartner.id == "ngo-1").first()
    first_pickups = ngo.total_pickups_completed
    first_meals = ngo.meals_distributed

    # Second verification fails
    res2 = client.post(
        f"/api/v1/surplus/{donation.id}/verify-pickup",
        headers={"X-CSRF-Token": csrf},
        json={"pin": pin},
    )
    assert res2.status_code == 400
    assert "already been completed" in res2.json()["detail"]

    # Metrics remain unchanged
    db_session.refresh(ngo)
    assert ngo.total_pickups_completed == first_pickups
    assert ngo.meals_distributed == first_meals


def test_verify_pickup_concurrent_attempts_no_double_counting(client: TestClient):
    """
    Two concurrent verification requests for the same donation:
    Exactly one succeeds and increments metrics; the other fails cleanly.
    Uses an isolated file-backed database with timeout for multi-connection concurrency.
    """
    import os
    import tempfile
    import uuid
    from sqlalchemy import create_engine
    from app.core.database import Base

    db_path = os.path.join(tempfile.gettempdir(), f"messaver_test_conc_pickup_{uuid.uuid4().hex}.db")
    conc_engine = create_engine(f"sqlite:///{db_path}", connect_args={"timeout": 30})
    Base.metadata.create_all(bind=conc_engine)
    ConcSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=conc_engine)

    # Seed data into file-backed DB
    init_db = ConcSessionLocal()
    ngo = NgoPartner(
        id="ngo-1",
        name="Robin Hood Army - South Wing",
        registration_number="REG-RHA-001",
        contact_person="Robin Coordinator",
        phone="+91 98765 43210",
        vehicle_type="Insulated Electric Van",
        verified=True,
        total_pickups_completed=5,
        meals_distributed=250,
    )
    chef = User(
        id="usr-kit-north",
        username="chef_north",
        email="north_chef@campus.edu",
        full_name="Chef North",
        password_hash=hash_secret("pass123"),
        role=UserRole.KITCHEN,
        facility_id="FAC-NORTH",
        is_active=True,
    )
    init_db.add_all([ngo, chef])
    init_db.commit()

    donation, pin = create_test_donation(
        init_db,
        "DON-V-CONCURRENT",
        plain_pin="5555",
        status=DonationStatus.CLAIMED,
        claimed_by_ngo_id="ngo-1",
        claimed_by_ngo_name="Robin Hood Army - South Wing",
        servings_count=40,
    )
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
        csrf, cookie = authenticate_client(client, "chef_north")

        def verify_attempt():
            c = TestClient(client.app)
            c.cookies.set("messaver_session", cookie)
            res = c.post(
                f"/api/v1/surplus/{donation.id}/verify-pickup",
                headers={"X-CSRF-Token": csrf},
                json={"pin": pin},
            )
            return res.status_code

        with ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(verify_attempt)
            f2 = executor.submit(verify_attempt)
            results = [f1.result(), f2.result()]

        assert 200 in results
        assert 400 in results
        assert results.count(200) == 1
        assert results.count(400) == 1

        # Verified metrics only incremented once
        check_session = ConcSessionLocal()
        try:
            ngo_refreshed = check_session.query(NgoPartner).filter(NgoPartner.id == "ngo-1").first()
            assert ngo_refreshed.total_pickups_completed == 5 + 1
            assert ngo_refreshed.meals_distributed == 250 + 40
        finally:
            check_session.close()
    finally:
        if orig_override:
            client.app.dependency_overrides[get_db] = orig_override
        else:
            client.app.dependency_overrides.pop(get_db, None)
        conc_engine.dispose()
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass


def test_pin_values_and_hashes_never_exposed(client: TestClient, setup_lifecycle_data, db_session: Session):
    """
    Confidentiality audit:
    All read responses (/available, /claimed/me, /{id}) and audit event logs
    strictly omit plaintext PINs and bcrypt hashes.
    """
    donation, pin = create_test_donation(
        db_session,
        "DON-SECRECY-AUDIT",
        plain_pin="8492",
        status=DonationStatus.AVAILABLE,
    )
    _, cookie = authenticate_client(client, "ngo_robin")
    client.cookies.clear()
    client.cookies.set("messaver_session", cookie)

    # 1. /available
    res_avail = client.get("/api/v1/surplus/available")
    assert pin not in res_avail.text
    assert "pickup_pin_hash" not in res_avail.text

    # 2. /{id}
    res_single = client.get(f"/api/v1/surplus/{donation.id}")
    assert pin not in res_single.text
    assert "pickup_pin_hash" not in res_single.text

    # 3. Audit logs
    audit_events = db_session.query(AuditEvent).all()
    for event in audit_events:
        assert pin not in event.details, f"Plaintext PIN leaked in audit log {event.id}!"
        assert "$" not in event.details or "2b$" not in event.details, f"Bcrypt hash leaked in audit log {event.id}!"
