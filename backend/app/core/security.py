import hashlib
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from pwdlib import PasswordHash
from backend.app.core.config import settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def password_fingerprint(hashed: str) -> str:
    """Short digest of the stored hash: a reset link stops working once the password changes."""
    return hashlib.sha256(hashed.encode()).hexdigest()[:16]


def create_token(subject: str, token_type: str, minutes: int, extra: dict | None = None) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            **(extra or {}),
            "sub": subject,
            "type": token_type,
            "iat": now,
            "exp": now + timedelta(minutes=minutes),
        },
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def decode_token(token: str, token_type: str) -> dict | None:
    try:
        data = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except (JWTError, TypeError):
        return None
    if data.get("type") != token_type or "sub" not in data:
        return None
    return data


def verify_token(token: str, token_type: str) -> str | None:
    data = decode_token(token, token_type)
    return data["sub"] if data else None
