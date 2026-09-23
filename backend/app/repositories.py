from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models import User, Course, Stream, Submission


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def by_login(self, login: str):
        return await self.db.scalar(
            select(User).where((User.username == login) | (User.email == login))
        )

    async def by_id(self, user_id: int):
        return await self.db.get(User, user_id)

    async def page(self, limit: int, offset: int):
        return list(
            (await self.db.scalars(select(User).limit(limit).offset(offset))).all()
        )


class CourseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, item_id: int):
        return await self.db.get(Course, item_id)

    async def page(self, limit: int, offset: int):
        return list(
            (await self.db.scalars(select(Course).limit(limit).offset(offset))).all()
        )


class StreamRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, item_id: int):
        return await self.db.get(Stream, item_id)

    async def page(self, limit: int, offset: int):
        return list(
            (await self.db.scalars(select(Stream).limit(limit).offset(offset))).all()
        )


class SubmissionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def own(self, task_id: int, user_id: int):
        return await self.db.scalar(
            select(Submission).where(
                Submission.task_id == task_id, Submission.user_id == user_id
            )
        )
