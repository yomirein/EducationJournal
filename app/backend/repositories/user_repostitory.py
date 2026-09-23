from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.user import UserCreate
from typing import Sequence
class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_data: UserCreate, hashed_password: str) -> User:
        user = User(role=user_data.role, name=user_data.name, password=hashed_password)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def get_all(self) -> Sequence[User]:
        result = await self.db.execute(select(User))
        return result.scalars().all()
