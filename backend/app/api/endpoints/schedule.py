from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import get_current_user
from backend.app.db import get_session
from backend.app.models import StreamParticipant, Stream, Submission, Task

router = APIRouter(tags=["schedule"])


@router.get("/users/me/schedule")
async def schedule(user=Depends(get_current_user), db: AsyncSession = Depends(get_session)):
    rows = await db.execute(select(Stream, StreamParticipant).join(StreamParticipant).where(StreamParticipant.user_id == user.id, StreamParticipant.status == "accepted"))
    return [{"stream": s, "participant": p} for s,p in rows.all()]
