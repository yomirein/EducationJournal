from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import get_current_user
from backend.app.core.config import settings
from backend.app.core.security import create_token, verify_token
from backend.app.db import get_session
from backend.app.schemas import Login, TokenPair, UserCreate, UserOut
from backend.app.services import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_session)):
    return await AuthService(db).register(data)


@router.post("/login", response_model=TokenPair)
async def login(data: Login, db: AsyncSession = Depends(get_session)):
    return await AuthService(db).login(data.login, data.password)


@router.post("/refresh", response_model=TokenPair)
async def refresh(refresh_token: str, db: AsyncSession = Depends(get_session)):
    subject = verify_token(refresh_token, "refresh")
    if not subject:
        raise HTTPException(401, "Invalid or expired refresh token")
    if not await AuthService(db).users.by_id(int(subject)):
        raise HTTPException(401, "User not found")
    return {
        "access_token": create_token(subject, "access", settings.access_token_expire),
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }
