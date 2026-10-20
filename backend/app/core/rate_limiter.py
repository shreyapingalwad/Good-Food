"""
Multi-tier rate limiter with bounded memory, anti-DoS protections, and shared backend adapter.

Architecture:
- BaseRateLimiter: Common interface for rate-limit and abuse tracking.
- InMemoryRateLimiter: Thread-safe in-memory implementation with automatic TTL key eviction
  and bounded retention.
- RedisRateLimiter: Redis-backed implementation for multi-worker production environments.
  Fails safe with logged warning falling back to in-memory if Redis is unreachable.
- Anti-DoS Account Protection: Prevents unauthenticated attackers from permanently locking
  accounts through combined IP throttling, progressive cooldown, and auto-decaying failure counters.
"""
import logging
import time
from abc import ABC, abstractmethod
from collections import defaultdict
from threading import Lock
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger("messaver.rate_limiter")


class RateLimiterUnavailableError(Exception):
    """Raised when shared rate limiter is unreachable and fail-closed policy is active."""
    pass


class BaseRateLimiter(ABC):
    """Abstract interface for rate limiting and attempt tracking."""

    @abstractmethod
    def record_ip_attempt(self, ip: str) -> None:
        pass

    @abstractmethod
    def is_ip_rate_limited(self, ip: str, max_attempts: int, window_seconds: int) -> bool:
        pass

    @abstractmethod
    def record_account_failure(self, identifier: str, lockout_threshold: int, lockout_duration: int) -> None:
        pass

    @abstractmethod
    def is_account_locked(self, identifier: str) -> bool:
        pass

    @abstractmethod
    def get_lockout_remaining(self, identifier: str) -> Optional[int]:
        pass

    @abstractmethod
    def clear_account_failures(self, identifier: str) -> None:
        pass

    @abstractmethod
    def clear_all(self) -> None:
        pass


class InMemoryRateLimiter(BaseRateLimiter):
    """
    Thread-safe in-memory rate limiter with bounded retention and automatic TTL eviction.
    Safe for development, testing, and single-worker deployments.
    """

    def __init__(self):
        self._lock = Lock()
        # IP attempts: {ip: [timestamps...]}
        self._ip_attempts: dict[str, list[float]] = defaultdict(list)
        # Account attempts: {identifier: {"count": int, "locked_until": float, "last_attempt": float}}
        self._account_attempts: dict[str, dict] = defaultdict(
            lambda: {"count": 0, "locked_until": 0.0, "last_attempt": 0.0}
        )

    def _evict_stale_keys(self, now: float, max_idle: float = 3600.0) -> None:
        """Evicts stale keys to prevent unbounded memory growth."""
        stale_ips = [
            ip for ip, timestamps in self._ip_attempts.items()
            if not timestamps or (now - timestamps[-1]) > max_idle
        ]
        for ip in stale_ips:
            del self._ip_attempts[ip]

        stale_accounts = [
            ident for ident, data in self._account_attempts.items()
            if data["locked_until"] <= now and (now - data["last_attempt"]) > max_idle
        ]
        for ident in stale_accounts:
            del self._account_attempts[ident]

    def record_ip_attempt(self, ip: str) -> None:
        with self._lock:
            now = time.monotonic()
            self._ip_attempts[ip].append(now)
            self._evict_stale_keys(now)

    def is_ip_rate_limited(self, ip: str, max_attempts: int, window_seconds: int) -> bool:
        with self._lock:
            now = time.monotonic()
            cutoff = now - window_seconds
            # Prune attempts outside window
            self._ip_attempts[ip] = [t for t in self._ip_attempts[ip] if t > cutoff]
            return len(self._ip_attempts[ip]) >= max_attempts

    def record_account_failure(self, identifier: str, lockout_threshold: int, lockout_duration: int) -> None:
        with self._lock:
            now = time.monotonic()
            entry = self._account_attempts[identifier]
            entry["count"] += 1
            entry["last_attempt"] = now
            if entry["count"] >= lockout_threshold:
                entry["locked_until"] = now + lockout_duration
                logger.warning(
                    f"Account identifier '{identifier}' locked for {lockout_duration}s "
                    f"after {entry['count']} failed attempts"
                )

    def is_account_locked(self, identifier: str) -> bool:
        with self._lock:
            entry = self._account_attempts.get(identifier)
            if not entry:
                return False
            now = time.monotonic()
            if entry["locked_until"] > now:
                return True
            # Lockout expired: reset
            if entry["locked_until"] > 0:
                entry["count"] = 0
                entry["locked_until"] = 0.0
            return False

    def get_lockout_remaining(self, identifier: str) -> Optional[int]:
        with self._lock:
            entry = self._account_attempts.get(identifier)
            if not entry or entry["locked_until"] <= time.monotonic():
                return None
            return int(entry["locked_until"] - time.monotonic())

    def clear_account_failures(self, identifier: str) -> None:
        with self._lock:
            if identifier in self._account_attempts:
                self._account_attempts[identifier] = {
                    "count": 0,
                    "locked_until": 0.0,
                    "last_attempt": 0.0,
                }

    def clear_all(self) -> None:
        with self._lock:
            self._ip_attempts.clear()
            self._account_attempts.clear()


class RedisRateLimiter(BaseRateLimiter):
    """
    Shared rate limiter backed by Redis for multi-worker and distributed production environments.
    In production: fails closed by raising RateLimiterUnavailableError if Redis is unavailable,
    preventing security control bypasses across worker processes.
    In development: configurable fallback to in-memory limiter with logged warnings.
    """

    def __init__(self, redis_url: str, fallback_to_memory: Optional[bool] = None):
        self._redis_url = redis_url
        settings = get_settings()
        self._fallback_to_memory = (
            fallback_to_memory if fallback_to_memory is not None
            else getattr(settings, "REDIS_FALLBACK_TO_MEMORY", True)
        )
        self._fallback = InMemoryRateLimiter() if self._fallback_to_memory else None
        self._redis_client = None
        self._init_client()

    def _init_client(self) -> None:
        try:
            import redis
            self._redis_client = redis.Redis.from_url(
                self._redis_url,
                socket_connect_timeout=2.0,
                socket_timeout=2.0,
                decode_responses=True,
            )
            # Connectivity check
            self._redis_client.ping()
        except Exception as e:
            if not self._fallback_to_memory:
                logger.error(
                    f"Redis client initialization failed ({e}). Fail-closed mode active; "
                    "in-memory fallback prohibited in production."
                )
                self._redis_client = None
            else:
                logger.warning(
                    f"Redis client initialization failed ({e}). Operating in memory fallback mode (dev only)."
                )
                self._redis_client = None

    def record_ip_attempt(self, ip: str) -> None:
        if not self._redis_client:
            if self._fallback:
                self._fallback.record_ip_attempt(ip)
                return
            raise RateLimiterUnavailableError("Shared Redis rate limiter is unavailable (fail-closed)")
        try:
            key = f"messaver:ratelimit:ip:{ip}"
            pipe = self._redis_client.pipeline()
            pipe.rpush(key, str(time.time()))
            pipe.expire(key, 1800)
            pipe.execute()
        except Exception as e:
            if self._fallback:
                logger.error(f"Redis error during record_ip_attempt ({e}). Falling back to in-memory.")
                self._fallback.record_ip_attempt(ip)
                return
            raise RateLimiterUnavailableError(f"Redis error during record_ip_attempt: {e}")

    def is_ip_rate_limited(self, ip: str, max_attempts: int, window_seconds: int) -> bool:
        if not self._redis_client:
            if self._fallback:
                return self._fallback.is_ip_rate_limited(ip, max_attempts, window_seconds)
            raise RateLimiterUnavailableError("Shared Redis rate limiter is unavailable (fail-closed)")
        try:
            key = f"messaver:ratelimit:ip:{ip}"
            now = time.time()
            cutoff = now - window_seconds
            timestamps = self._redis_client.lrange(key, 0, -1)
            valid = [float(t) for t in timestamps if float(t) > cutoff]
            return len(valid) >= max_attempts
        except Exception as e:
            if self._fallback:
                logger.error(f"Redis error during is_ip_rate_limited ({e}). Falling back to in-memory.")
                return self._fallback.is_ip_rate_limited(ip, max_attempts, window_seconds)
            raise RateLimiterUnavailableError(f"Redis error during is_ip_rate_limited: {e}")

    def record_account_failure(self, identifier: str, lockout_threshold: int, lockout_duration: int) -> None:
        if not self._redis_client:
            if self._fallback:
                self._fallback.record_account_failure(identifier, lockout_threshold, lockout_duration)
                return
            raise RateLimiterUnavailableError("Shared Redis rate limiter is unavailable (fail-closed)")
        try:
            count_key = f"messaver:lockout:count:{identifier}"
            lock_key = f"messaver:lockout:locked:{identifier}"
            count = self._redis_client.incr(count_key)
            self._redis_client.expire(count_key, lockout_duration)
            if count >= lockout_threshold:
                self._redis_client.set(lock_key, "1", ex=lockout_duration)
                logger.warning(f"Shared Redis lockout applied to identifier '{identifier}'")
        except Exception as e:
            if self._fallback:
                logger.error(f"Redis error during record_account_failure ({e}). Falling back to in-memory.")
                self._fallback.record_account_failure(identifier, lockout_threshold, lockout_duration)
                return
            raise RateLimiterUnavailableError(f"Redis error during record_account_failure: {e}")

    def is_account_locked(self, identifier: str) -> bool:
        if not self._redis_client:
            if self._fallback:
                return self._fallback.is_account_locked(identifier)
            raise RateLimiterUnavailableError("Shared Redis rate limiter is unavailable (fail-closed)")
        try:
            lock_key = f"messaver:lockout:locked:{identifier}"
            return bool(self._redis_client.exists(lock_key))
        except Exception as e:
            if self._fallback:
                logger.error(f"Redis error during is_account_locked ({e}). Falling back to in-memory.")
                return self._fallback.is_account_locked(identifier)
            raise RateLimiterUnavailableError(f"Redis error during is_account_locked: {e}")

    def get_lockout_remaining(self, identifier: str) -> Optional[int]:
        if not self._redis_client:
            if self._fallback:
                return self._fallback.get_lockout_remaining(identifier)
            raise RateLimiterUnavailableError("Shared Redis rate limiter is unavailable (fail-closed)")
        try:
            lock_key = f"messaver:lockout:locked:{identifier}"
            ttl = self._redis_client.ttl(lock_key)
            return ttl if ttl and ttl > 0 else None
        except Exception as e:
            if self._fallback:
                logger.error(f"Redis error during get_lockout_remaining ({e}). Falling back to in-memory.")
                return self._fallback.get_lockout_remaining(identifier)
            raise RateLimiterUnavailableError(f"Redis error during get_lockout_remaining: {e}")

    def clear_account_failures(self, identifier: str) -> None:
        if not self._redis_client:
            if self._fallback:
                self._fallback.clear_account_failures(identifier)
                return
            raise RateLimiterUnavailableError("Shared Redis rate limiter is unavailable (fail-closed)")
        try:
            self._redis_client.delete(
                f"messaver:lockout:count:{identifier}",
                f"messaver:lockout:locked:{identifier}",
            )
        except Exception as e:
            if self._fallback:
                logger.error(f"Redis error during clear_account_failures ({e}). Falling back to in-memory.")
                self._fallback.clear_account_failures(identifier)
                return
            raise RateLimiterUnavailableError(f"Redis error during clear_account_failures: {e}")

    def clear_all(self) -> None:
        if self._fallback:
            self._fallback.clear_all()
        if self._redis_client:
            try:
                keys = self._redis_client.keys("messaver:*")
                if keys:
                    self._redis_client.delete(*keys)
            except Exception:
                pass


def create_rate_limiter() -> BaseRateLimiter:
    """Factory creating the appropriate rate limiter backend based on settings."""
    settings = get_settings()
    if settings.REDIS_URL:
        logger.info(f"Using shared Redis rate limiter backend at {settings.REDIS_URL}")
        return RedisRateLimiter(
            settings.REDIS_URL,
            fallback_to_memory=settings.REDIS_FALLBACK_TO_MEMORY,
        )
    return InMemoryRateLimiter()


# Default singleton rate limiter
login_tracker = create_rate_limiter()
