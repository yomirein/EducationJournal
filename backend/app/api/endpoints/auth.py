from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.core.rate_limit import rate_limit
from backend.app.core.security import create_token, verify_token
from backend.app.db import get_session
from backend.app.schemas import (
    ForgotPasswordRequest,
    Login,
    RefreshRequest,
    ResetPasswordRequest,
    TokenPair,
    UserCreate,
    UserOut,
)
from backend.app.services import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserOut,
    status_code=201,
    dependencies=[Depends(rate_limit(10, 600))],
)
async def register(
    data: UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_session),
):
    return await AuthService(db).register(data, background_tasks)


@router.post(
    "/verify-email",
    response_model=UserOut,
    dependencies=[Depends(rate_limit(20, 600))],
)
async def verify_email(token: str, db: AsyncSession = Depends(get_session)):
    return await AuthService(db).verify_email(token)


@router.post(
    "/resend-verification",
    status_code=204,
    dependencies=[Depends(rate_limit(3, 600))],
)
async def resend_verification(
    email: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_session),
):
    await AuthService(db).resend_verification(email, background_tasks)


@router.post(
    "/forgot-password",
    status_code=204,
    dependencies=[Depends(rate_limit(5, 600))],
)
async def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_session),
):
    await AuthService(db).forgot_password(data.login, background_tasks)


@router.post(
    "/reset-password",
    status_code=204,
    dependencies=[Depends(rate_limit(10, 600))],
)
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_session)):
    await AuthService(db).reset_password(data.token, data.password)


@router.post(
    "/confirm-email-change",
    response_model=UserOut,
    dependencies=[Depends(rate_limit(20, 600))],
)
async def confirm_email_change(token: str, db: AsyncSession = Depends(get_session)):
    return await AuthService(db).confirm_email_change(token)


@router.post(
    "/login",
    response_model=TokenPair,
    dependencies=[Depends(rate_limit(20, 60))],
)
async def login(data: Login, db: AsyncSession = Depends(get_session)):
    return await AuthService(db).login(data.login, data.password)


@router.post("/refresh", response_model=TokenPair)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_session)):
    subject = verify_token(data.refresh_token, "refresh")
    if not subject:
        raise HTTPException(401, "Invalid or expired refresh token")
    if not await AuthService(db).users.by_id(int(subject)):
        raise HTTPException(401, "User not found")
    return {
        "access_token": create_token(subject, "access", settings.access_token_expire),
        "refresh_token": data.refresh_token,
        "token_type": "bearer",
    }
