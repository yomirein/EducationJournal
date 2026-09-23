from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import get_current_user, require_role
from backend.app.db import get_session
from backend.app.models import Stream, StreamParticipant, User, UserRole
from backend.app.schemas import UserOut, UserUpdate
from backend.app.services import UserService

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return user


@router.patch("/users/me", response_model=UserOut)
async def update_me(
    data: UserUpdate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    return await UserService(db).update(user, data)


@router.delete("/users/me", status_code=204)
async def delete_me(
    user=Depends(get_current_user), db: AsyncSession = Depends(get_session)
):
    await db.delete(user)
    await db.commit()


@router.get("/users/{user_id}", response_model=UserOut)
async def profile(
    user_id: int,
    current=Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    target = await UserService(db).get(user_id)
    allowed = current.id == target.id or current.role == UserRole.admin
    if current.role == UserRole.curator:
        allowed = bool(
            await db.scalar(
                select(StreamParticipant.id)
                .join(Stream)
                .where(
                    Stream.curator_id == current.id,
                    StreamParticipant.user_id == target.id,
                    StreamParticipant.status == "accepted",
                )
            )
        )
    if not allowed:
        raise HTTPException(403, "Profile access denied")
    return target


@router.get("/users/{user_id}/streams")
async def user_streams(
    user_id: int,
    current=Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if current.id != user_id and current.role != UserRole.admin:
        raise HTTPException(403, "Access denied")
    return list(
        (
            await db.scalars(
                select(Stream)
                .join(StreamParticipant)
                .where(StreamParticipant.user_id == user_id)
            )
        ).all()
    )


@router.get("/users/me/rating")
async def rating(
    user=Depends(get_current_user), db: AsyncSession = Depends(get_session)
):
    from backend.app.models import StreamRating

    return await db.get(StreamRating, user.id)


@router.get("/users/me/history")
async def history(
    user=Depends(get_current_user), db: AsyncSession = Depends(get_session)
):
    from backend.app.models import Submission

    return list(
        (
            await db.scalars(select(Submission).where(Submission.user_id == user.id))
        ).all()
    )
