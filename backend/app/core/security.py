from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from pwdlib import PasswordHash
from backend.app.core.config import settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_token(subject: str, token_type: str, minutes: int) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": subject,
            "type": token_type,
            "iat": now,
            "exp": now + timedelta(minutes=minutes),
        },
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def verify_token(token: str, token_type: str) -> str | None:
    try:
        data = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return data["sub"] if data.get("type") == token_type else None
    except (JWTError, KeyError, TypeError):
        return None
