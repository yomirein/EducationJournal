from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user_repostitory import UserRepository
from app.schemas.user import UserCreate
from app.core.security import hash_password

class UserService:
    def __init__(self, db: UserRepository):
        self.repo = UserRepository(db)

    async def register_user(self, user_data: UserCreate):
            hashed = hash_password(user_data.password)
            return await self.repo.create(user_data, hashed)

    async def get_all_users(self):
            return await self.repo.get_all()
