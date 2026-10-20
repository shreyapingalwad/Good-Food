from functools import lru_cache
import secrets
from typing import Optional
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    MessSaver Backend Application Settings.
    Reads environment variables from the OS environment or a local .env file.
    Does NOT provide insecure default credentials for production databases.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = Field(default="MessSaver Operational Backend", description="Application Title")
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development", description="Runtime environment: development | staging | production")
    DEBUG: bool = Field(default=False, description="Enable debug mode")

    # Authoritative operational database connection string
    # Must be explicitly provided in environment or .env. No hard-coded password fallback allowed.
    DATABASE_URL: str = Field(
        ...,
        description="Authoritative database connection URL (e.g. postgresql+psycopg://user:pass@host:5432/messaver)"
    )

    # Optional dedicated test database URL (e.g. for isolated SQLite tests)
    TEST_DATABASE_URL: Optional[str] = Field(
        default=None,
        description="Optional separate database URL for automated testing"
    )

    API_HOST: str = Field(default="127.0.0.1", description="Bind host for local server")
    API_PORT: int = Field(default=8000, description="Bind port for local server")

    # ── CORS Settings ────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
        description="Allowed origins for CORS requests"
    )

    # ── Reverse Proxy & IP Resolution ───────────────────────────────────────
    TRUSTED_PROXIES: list[str] = Field(
        default=["127.0.0.1", "::1"],
        description="List of trusted reverse proxy IP addresses"
    )

    # ── Authentication & Session Configuration ──────────────────────────────
    # Secret used for signing session tokens (HMAC-SHA256).
    # In development: auto-generated per process if not set.
    # In production: MUST be explicitly provided and >= 32 characters.
    SESSION_SECRET: Optional[str] = Field(
        default=None,
        description="Server-side session signing secret. Required in production."
    )

    # Session lifetime in seconds (default 8 hours)
    SESSION_MAX_AGE_SECONDS: int = Field(
        default=28800,
        description="Maximum session age in seconds"
    )

    # Session idle timeout in seconds (default 30 minutes)
    SESSION_IDLE_TIMEOUT_SECONDS: int = Field(
        default=1800,
        description="Session idle inactivity timeout in seconds (default 30 minutes)"
    )

    # Cookie security settings
    COOKIE_SECURE: Optional[bool] = Field(
        default=None,
        description="Force Secure flag on cookies. Auto-detected from ENVIRONMENT if not set."
    )
    COOKIE_SAMESITE: str = Field(
        default="lax",
        description="SameSite attribute for session cookie: lax | strict | none"
    )
    COOKIE_DOMAIN: Optional[str] = Field(
        default=None,
        description="Optional cookie domain restriction"
    )

    # ── CSRF Protection ─────────────────────────────────────────────────────
    CSRF_SECRET: Optional[str] = Field(
        default=None,
        description="Secret for CSRF token generation. Required in production."
    )

    # ── Rate Limiting & Abuse Prevention ─────────────────────────────────────
    REDIS_URL: Optional[str] = Field(
        default=None,
        description="Optional Redis connection URL for shared multi-worker rate limiting (e.g. redis://localhost:6379/0)"
    )
    REDIS_FALLBACK_TO_MEMORY: Optional[bool] = Field(
        default=None,
        description="Whether to permit in-memory fallback if Redis is down. Defaults to True in dev, False in production."
    )
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: int = Field(
        default=900,
        description="Window in seconds for login rate limiting (default 15 minutes)"
    )
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS: int = Field(
        default=10,
        description="Maximum login attempts per IP within the rate limit window"
    )
    ACCOUNT_LOCKOUT_THRESHOLD: int = Field(
        default=8,
        description="Consecutive failed login attempts before temporary account lockout"
    )
    ACCOUNT_LOCKOUT_DURATION_SECONDS: int = Field(
        default=1800,
        description="Account lockout duration in seconds (default 30 minutes)"
    )

    # ── Pickup PIN Security ──────────────────────────────────────────────────
    # Server-side secret pepper for keyed hashing of 4-digit pickup PINs.
    # Kept outside the database. In production: MUST be explicitly provided.
    PIN_PEPPER: Optional[str] = Field(
        default=None,
        description="Server-side pepper for keyed PIN verification. Required in production."
    )
    PIN_LOCKOUT_MAX_ATTEMPTS: int = Field(
        default=3,
        description="Maximum failed verification attempts before temporary donation PIN lockout"
    )
    PIN_LOCKOUT_WINDOW_SECONDS: int = Field(
        default=900,
        description="PIN lockout cooldown window in seconds (default 15 minutes)"
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError(
                "DATABASE_URL is required and cannot be empty. "
                "Provide an explicit PostgreSQL URL (e.g. postgresql+psycopg://user:password@localhost:5432/messaver_db) "
                "via environment variables or a local .env file."
            )
        # Normalize postgres:// to postgresql+psycopg:// if needed for standard SQLAlchemy
        if v_stripped.startswith("postgres://"):
            v_stripped = v_stripped.replace("postgres://", "postgresql+psycopg://", 1)
        elif v_stripped.startswith("postgresql://") and "+psycopg" not in v_stripped and "+asyncpg" not in v_stripped:
            v_stripped = v_stripped.replace("postgresql://", "postgresql+psycopg://", 1)
        return v_stripped

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """
        In production, require explicit strong secrets for session signing,
        CSRF protection, and PIN pepper. Never fall back to auto-generated
        or weak secrets in production.
        """
        is_production = self.ENVIRONMENT.lower() == "production"

        if is_production:
            if self.REDIS_FALLBACK_TO_MEMORY is None:
                self.REDIS_FALLBACK_TO_MEMORY = False
            elif self.REDIS_FALLBACK_TO_MEMORY:
                raise ValueError(
                    "REDIS_FALLBACK_TO_MEMORY cannot be True in production. "
                    "Rate limiting must fail closed when the shared Redis backend is unavailable."
                )

            if "*" in self.CORS_ORIGINS:
                raise ValueError(
                    "Wildcard origin '*' is strictly prohibited in production when credentials are enabled."
                )
            if not self.SESSION_SECRET or len(self.SESSION_SECRET) < 32:
                raise ValueError(
                    "SESSION_SECRET is required in production and must be >= 32 characters. "
                    "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
                )
            if not self.CSRF_SECRET or len(self.CSRF_SECRET) < 32:
                raise ValueError(
                    "CSRF_SECRET is required in production and must be >= 32 characters."
                )
            if not self.PIN_PEPPER or len(self.PIN_PEPPER) < 16:
                raise ValueError(
                    "PIN_PEPPER is required in production and must be >= 16 characters. "
                    "This secret must be kept outside the database and source control."
                )
        else:
            if self.REDIS_FALLBACK_TO_MEMORY is None:
                self.REDIS_FALLBACK_TO_MEMORY = True
            # Development/testing: auto-generate ephemeral secrets if not explicitly set.
            # These change every process restart, which is acceptable for local dev.
            if not self.SESSION_SECRET:
                self.SESSION_SECRET = secrets.token_urlsafe(64)
            if not self.CSRF_SECRET:
                self.CSRF_SECRET = secrets.token_urlsafe(64)
            if not self.PIN_PEPPER:
                self.PIN_PEPPER = "dev-only-pin-pepper-not-for-production"

        return self

    def get_cookie_secure(self) -> bool:
        """Returns whether Secure flag should be set on cookies."""
        if self.COOKIE_SECURE is not None:
            return self.COOKIE_SECURE
        return self.ENVIRONMENT.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
