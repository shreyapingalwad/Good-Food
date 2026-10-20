"""
Unit tests for authentication configuration and production safeguards.
"""
import pytest
from pydantic import ValidationError
from app.core.config import Settings


def test_production_requires_session_secret():
    """Verify production environment rejects missing or weak SESSION_SECRET."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL="postgresql+psycopg://user:pass@host:5432/messaver",
            SESSION_SECRET="short_secret",  # < 32 chars
            CSRF_SECRET="valid_csrf_secret_that_is_at_least_32_characters_long",
            PIN_PEPPER="valid_pepper_secret_16",
        )
    assert "SESSION_SECRET is required in production" in str(exc_info.value)


def test_production_requires_csrf_secret():
    """Verify production environment rejects missing or weak CSRF_SECRET."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL="postgresql+psycopg://user:pass@host:5432/messaver",
            SESSION_SECRET="valid_session_secret_that_is_at_least_32_characters_long",
            CSRF_SECRET="short",  # < 32 chars
            PIN_PEPPER="valid_pepper_secret_16",
        )
    assert "CSRF_SECRET is required in production" in str(exc_info.value)


def test_production_requires_pin_pepper():
    """Verify production environment rejects missing or weak PIN_PEPPER."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL="postgresql+psycopg://user:pass@host:5432/messaver",
            SESSION_SECRET="valid_session_secret_that_is_at_least_32_characters_long",
            CSRF_SECRET="valid_csrf_secret_that_is_at_least_32_characters_long",
            PIN_PEPPER="short",  # < 16 chars
        )
    assert "PIN_PEPPER is required in production" in str(exc_info.value)


def test_production_accepts_strong_secrets():
    """Verify production environment initializes successfully with strong secrets."""
    settings = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql+psycopg://user:pass@host:5432/messaver",
        SESSION_SECRET="production_super_strong_session_secret_key_1234567890",
        CSRF_SECRET="production_super_strong_csrf_secret_key_1234567890",
        PIN_PEPPER="production_pepper_key_16_chars!",
    )
    assert settings.ENVIRONMENT == "production"
    assert settings.get_cookie_secure() is True


def test_development_auto_generates_secrets():
    """Verify development mode auto-generates ephemeral secrets safely."""
    settings = Settings(
        ENVIRONMENT="development",
        DATABASE_URL="postgresql+psycopg://user:pass@host:5432/messaver",
    )
    assert settings.SESSION_SECRET is not None
    assert len(settings.SESSION_SECRET) >= 32
    assert settings.CSRF_SECRET is not None
    assert len(settings.CSRF_SECRET) >= 32
    assert settings.PIN_PEPPER is not None
    assert settings.get_cookie_secure() is False


def test_cookie_secure_override():
    """Verify COOKIE_SECURE setting can be explicitly set in development if needed."""
    settings = Settings(
        ENVIRONMENT="development",
        DATABASE_URL="postgresql+psycopg://user:pass@host:5432/messaver",
        COOKIE_SECURE=True,
    )
    assert settings.get_cookie_secure() is True
