from unittest.mock import MagicMock
from sqlalchemy.orm import Session
from app.core.database import get_db, ping_database


def test_session_lifecycle_yields_and_closes():
    """Verify get_db dependency yields a valid SQLAlchemy session and closes it."""
    generator = get_db()
    session = next(generator)
    assert isinstance(session, Session)
    assert session.is_active is True

    # Closing generator should clean up session
    try:
        next(generator)
    except StopIteration:
        pass


def test_ping_database_success(db_session):
    """Verify ping_database executes SELECT 1 and returns True."""
    assert ping_database(db_session) is True


def test_ping_database_failure():
    """Verify ping_database safely returns False when query execution raises an exception."""
    broken_session = MagicMock(spec=Session)
    broken_session.execute.side_effect = Exception("Connection lost")

    result = ping_database(broken_session)
    assert result is False
