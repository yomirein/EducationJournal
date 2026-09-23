from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.security import verify_token
from backend.app.db import get_session
from backend.app.models import UserRole
from backend.app.repositories import UserRepository

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(token: str = Depends(oauth2), db: AsyncSession = Depends(get_session)):
    subject = verify_token(token, "access")
    if not subject: raise HTTPException(401, "Invalid or expired access token", headers={"WWW-Authenticate": "Bearer"})
    try: user = await UserRepository(db).by_id(int(subject))
    except ValueError: user = None
    if not user: raise HTTPException(401, "User not found")
    return user


def require_role(*roles: UserRole):
    async def check(user=Depends(get_current_user)):
        if user.role not in roles: raise HTTPException(403, "Insufficient permissions")
        return user
    return check
