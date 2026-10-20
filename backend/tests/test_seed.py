import pytest
from app.core.security import verify_secret
from app.db.seed import seed_database
from app.models.ngo import NgoPartner
from app.models.donation import SurplusDonation
from app.models.user import User


def test_seed_initial_run_populates_data(db_session):
    """Verify seed populates initial data in development environment."""
    stats = seed_database(db_session, environment="development")
    assert stats["ngos"] == 3
    assert stats["donations"] == 2
    assert stats["kitchen_logs"] == 1
    assert stats["audits"] == 3
    assert stats["configs"] == 2
    assert stats["users"] == 5

    # Check that PINs and passwords are saved as hashes, not plaintext
    don = db_session.query(SurplusDonation).filter(SurplusDonation.id == "DON-8841").first()
    assert don is not None
    assert don.pickup_pin_hash != "4829"
    assert verify_secret("4829", don.pickup_pin_hash) is True

    user = db_session.query(User).filter(User.username == "student_shreya").first()
    assert user is not None
    assert user.password_hash != "DevStudentPass123!"
    assert verify_secret("DevStudentPass123!", user.password_hash) is True


def test_seed_idempotency_prevents_duplicate_records(db_session):
    """Verify running seed multiple times is idempotent and produces no errors or duplicates."""
    first_stats = seed_database(db_session, environment="development")
    assert first_stats["ngos"] == 3

    # Run a second time
    second_stats = seed_database(db_session, environment="development")
    assert second_stats["ngos"] == 0
    assert second_stats["donations"] == 0
    assert second_stats["kitchen_logs"] == 0
    assert second_stats["users"] == 0

    total_ngos = db_session.query(NgoPartner).count()
    assert total_ngos == 3


def test_seed_prohibited_in_production(db_session):
    """Verify seed utility strictly refuses to run when environment is production."""
    with pytest.raises(RuntimeError) as exc_info:
        seed_database(db_session, environment="production")
    assert "CRITICAL: Seed execution is strictly prohibited in production" in str(exc_info.value)
