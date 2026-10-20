import pytest
from pydantic import ValidationError
from app.core.config import Settings


def test_valid_database_url_configuration():
    """Verify settings loads properly when valid DATABASE_URL is provided."""
    settings = Settings(DATABASE_URL="postgresql+psycopg://user:secret@localhost:5432/messaver")
    assert settings.DATABASE_URL == "postgresql+psycopg://user:secret@localhost:5432/messaver"
    assert settings.ENVIRONMENT in ["development", "testing", "production"]


def test_missing_database_url_raises_validation_error():
    """Verify validation error when DATABASE_URL is missing."""
    with pytest.raises(ValidationError):
        Settings(_env_file=None, DATABASE_URL=None)  # type: ignore


def test_empty_database_url_rejected():
    """Verify empty string for DATABASE_URL is strictly rejected."""
    with pytest.raises(ValidationError):
        Settings(_env_file=None, DATABASE_URL="   ")


def test_postgres_url_normalization():
    """Verify legacy postgres:// and postgresql:// schemes normalize to postgresql+psycopg://."""
    settings = Settings(DATABASE_URL="postgres://user:pass@localhost:5432/db")
    assert settings.DATABASE_URL == "postgresql+psycopg://user:pass@localhost:5432/db"

    settings2 = Settings(DATABASE_URL="postgresql://user:pass@localhost:5432/db")
    assert settings2.DATABASE_URL == "postgresql+psycopg://user:pass@localhost:5432/db"
