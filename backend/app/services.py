from fastapi import HTTPException, BackgroundTasks
from sqlalchemy.exc import IntegrityError
from backend.app.core.security import hash_password, verify_password, create_token
from backend.app.core.config import settings
from backend.app.core.email import send_verification_email
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
        from backend.app.core.security import verify_token

        user_id = verify_token(token, "email_verification")
        if not user_id:
            raise HTTPException(400, "Invalid or expired verification token")

        user = await self.users.by_id(int(user_id))
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

    async def login(self, login, password):
        user = await self.users.by_login(login)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(401, "Invalid credentials")
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

    async def update(self, user, data):
        values = data.model_dump(exclude_unset=True)
        if values.get("password"):
            values["password_hash"] = hash_password(values.pop("password"))
        for key, value in values.items():
            setattr(user, key, value)
        try:
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(409, "Email already exists")
        await self.db.refresh(user)
        return user
