import bcrypt


def hash_secret(secret: str) -> str:
    """
    Cryptographically hashes sensitive strings (passwords, 4-digit pickup PINs).
    Uses bcrypt with a secure work factor. Plaintext is never persisted.
    """
    secret_bytes = secret.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(secret_bytes, salt).decode("utf-8")


def verify_secret(plain_secret: str, hashed_secret: str) -> bool:
    """
    Verifies a plain secret against its stored bcrypt hash.
    Constant-time comparison prevents timing attacks.
    """
    try:
        return bcrypt.checkpw(
            plain_secret.encode("utf-8"),
            hashed_secret.encode("utf-8")
        )
    except Exception:
        return False
