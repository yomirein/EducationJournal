from fastapi import HTTPException, BackgroundTasks
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from backend.app.core.security import (
    create_token,
    decode_token,
    hash_password,
    password_fingerprint,
    verify_password,
)
from backend.app.core.config import settings
from backend.app.core.email import (
    send_email_change_email,
    send_password_reset_email,
    send_verification_email,
)
from backend.app.models import User, UserRole
from backend.app.repositories import UserRepository


class AuthService:
    def __init__(self, db):
        self.db, self.users = db, UserRepository(db)

    async def register(self, data, background_tasks: BackgroundTasks | None = None):
        user = User(
            first_name=data.first_name,
            last_name=data.last_name,
            username=data.username,
            email=data.email,
            password_hash=hash_password(data.password),
            role=UserRole.student,
            is_verified=False,
        )
        self.db.add(user)
        try:
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(409, "Username or email already exists")
        await self.db.refresh(user)

        # Send verification email in background
        if background_tasks:
            token = create_token(
                str(user.id), "email_verification", settings.verification_token_expire
            )
            background_tasks.add_task(send_verification_email, user.email, token)

        return user

    async def verify_email(self, token: str):
        data = decode_token(token, "email_verification")
        if not data:
            raise HTTPException(400, "Invalid or expired verification token")

        user = await self.users.by_id(int(data["sub"]))
        if not user:
            raise HTTPException(404, "User not found")

        if user.is_verified:
            raise HTTPException(400, "Email already verified")

        user.is_verified = True
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def resend_verification(self, email: str, background_tasks: BackgroundTasks):
        user = await self.users.by_login(email)
        if not user:
            raise HTTPException(404, "User not found")

        if user.is_verified:
            raise HTTPException(400, "Email already verified")

        token = create_token(
            str(user.id), "email_verification", settings.verification_token_expire
        )
        background_tasks.add_task(send_verification_email, user.email, token)

    async def forgot_password(self, login: str, background_tasks: BackgroundTasks) -> None:
        """Mails a reset link. Silent when the account is unknown, so the form cannot probe accounts."""
        user = await self.users.by_login(login.strip())
        if not user:
            return
        token = create_token(
            str(user.id),
            "password_reset",
            settings.password_reset_token_expire,
            extra={"pwd": password_fingerprint(user.password_hash)},
        )
        background_tasks.add_task(send_password_reset_email, user.email, token)

    async def reset_password(self, token: str, password: str) -> None:
        data = decode_token(token, "password_reset")
        user = await self.users.by_id(int(data["sub"])) if data else None
        # The fingerprint changes with the password, so a link works only once.
        if not user or data.get("pwd") != password_fingerprint(user.password_hash):
            raise HTTPException(400, "Invalid or expired reset token")
        user.password_hash = hash_password(password)
        # Following the emailed link proves the user owns the address.
        user.is_verified = True
        await self.db.commit()

    async def confirm_email_change(self, token: str):
        data = decode_token(token, "email_change")
        user = await self.users.by_id(int(data["sub"])) if data else None
        if not user or not user.pending_email or data.get("email") != user.pending_email:
            raise HTTPException(400, "Invalid or expired email change token")
        if await UserService(self.db).email_taken(user.pending_email, user.id):
            raise HTTPException(409, "Email already exists")
        user.email, user.pending_email = user.pending_email, None
        user.is_verified = True
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def login(self, login, password):
        user = await self.users.by_login(login)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(401, "Invalid credentials")
        if not user.is_verified:
            raise HTTPException(403, "Email is not verified")
        return {
            "access_token": create_token(
                str(user.id), "access", settings.access_token_expire
            ),
            "refresh_token": create_token(
                str(user.id), "refresh", settings.refresh_token_expire
            ),
            "token_type": "bearer",
        }


class UserService:
    def __init__(self, db):
        self.db, self.repo = db, UserRepository(db)

    async def get(self, user_id):
        user = await self.repo.by_id(user_id)
        if not user:
            raise HTTPException(404, "User not found")
        return user

    async def email_taken(self, email: str, user_id: int) -> bool:
        return bool(await self.db.scalar(
            select(User.id).where(func.lower(User.email) == email.lower(), User.id != user_id)
        ))

    async def update(self, user, data, background_tasks: BackgroundTasks | None = None):
        values = data.model_dump(exclude_unset=True)
        current_password = values.pop("current_password", None)
        new_password = values.pop("password", None)
        new_email = values.pop("email", None)
        email_changes = bool(new_email) and new_email.lower() != user.email.lower()

        # Password and email are account keys: changing them needs the current password.
        if (new_password or email_changes) and not (
            current_password and verify_password(current_password, user.password_hash)
        ):
            raise HTTPException(400, "Current password is incorrect")
        if new_password:
            user.password_hash = hash_password(new_password)
        if email_changes:
            if await self.email_taken(new_email, user.id):
                raise HTTPException(409, "Email already exists")
            # The address changes only after the owner follows the link sent to it.
            user.pending_email = new_email
            if background_tasks:
                token = create_token(
                    str(user.id), "email_change", settings.email_change_token_expire,
                    extra={"email": new_email},
                )
                background_tasks.add_task(send_email_change_email, new_email, token)
        elif new_email:
            user.pending_email = None
        for key, value in values.items():
            setattr(user, key, value)
        try:
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(409, "Email already exists")
        await self.db.refresh(user)
        return user
