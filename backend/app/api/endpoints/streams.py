from fastapi import APIRouter, Depends, HTTPException, Query
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import get_current_user, require_role
from backend.app.db import get_session
from backend.app.models import UserRole, Stream, StreamParticipant, Broadcast, StreamBroadcast, Task, Submission, User
from backend.app.schemas import GradeUpdate

router = APIRouter(prefix="/streams", tags=["streams"])


async def owned(stream_id, user, db):
    item = await db.get(Stream, stream_id)
    if not item: raise HTTPException(404, "Stream not found")
    if item.curator_id != user.id: raise HTTPException(403, "Stream access denied")
    return item


@router.get("")
async def streams(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0), db: AsyncSession = Depends(get_session)):
    return list((await db.scalars(select(Stream).limit(limit).offset(offset))).all())


@router.post("/{stream_id}/join", status_code=201)
async def join(stream_id: int, user=Depends(require_role(UserRole.student)), db: AsyncSession = Depends(get_session)):
    if not await db.get(Stream, stream_id): raise HTTPException(404, "Stream not found")
    item = await db.scalar(select(StreamParticipant).where(StreamParticipant.stream_id == stream_id, StreamParticipant.user_id == user.id))
    if item and item.status == "pending": raise HTTPException(409, "Application already pending")
    if item: item.status = "pending"
    else: item = StreamParticipant(stream_id=stream_id, user_id=user.id); db.add(item)
    await db.commit(); return item


@router.get("/{stream_id}/participants")
async def participants(stream_id: int, user=Depends(require_role(UserRole.curator)), db: AsyncSession = Depends(get_session)):
    await owned(stream_id, user, db)
    return list((await db.scalars(select(StreamParticipant).where(StreamParticipant.stream_id == stream_id))).all())


@router.post("/{stream_id}/participants/{user_id}/{decision}")
async def decide(stream_id: int, user_id: int, decision: str, curator=Depends(require_role(UserRole.curator)), db: AsyncSession = Depends(get_session)):
    await owned(stream_id, curator, db)
    if decision not in ("accept", "reject"): raise HTTPException(422, "Decision must be accept or reject")
    item = await db.scalar(select(StreamParticipant).where(StreamParticipant.stream_id == stream_id, StreamParticipant.user_id == user_id))
    if not item: raise HTTPException(404, "Application not found")
    item.status = "accepted" if decision == "accept" else "rejected"; await db.commit(); return item


@router.post("/{stream_id}/broadcasts", status_code=201)
async def create_broadcast(stream_id: int, data: dict, curator=Depends(require_role(UserRole.curator)), db: AsyncSession = Depends(get_session)):
    await owned(stream_id, curator, db)
    text = data.get("text")
    if not isinstance(text, str) or not text.strip(): raise HTTPException(422, "text is required")
    item = Broadcast(curator_id=curator.id, text=text); db.add(item); await db.flush()
    db.add(StreamBroadcast(stream_id=stream_id, broadcast_id=item.id)); await db.commit(); await db.refresh(item); return item


@router.get("/{stream_id}/broadcasts")
async def broadcasts(stream_id: int, user=Depends(get_current_user), db: AsyncSession = Depends(get_session)):
    stream = await db.get(Stream, stream_id)
    if not stream: raise HTTPException(404, "Stream not found")
    if user.role == UserRole.curator:
        await owned(stream_id, user, db)
    elif user.role == UserRole.student:
        enrolled = await db.scalar(select(StreamParticipant.id).where(StreamParticipant.stream_id == stream_id, StreamParticipant.user_id == user.id, StreamParticipant.status == "accepted"))
        if not enrolled: raise HTTPException(403, "Stream access denied")
    else:
        raise HTTPException(403, "Stream access denied")
    return list((await db.scalars(select(Broadcast).join(StreamBroadcast).where(StreamBroadcast.stream_id == stream_id))).all())


@router.get("/{stream_id}/tasks/{task_id}/submissions")
async def submissions(stream_id: int, task_id: int, curator=Depends(require_role(UserRole.curator)), db: AsyncSession = Depends(get_session)):
    await owned(stream_id, curator, db)
    return list((await db.scalars(select(Submission).join(StreamParticipant, StreamParticipant.user_id == Submission.user_id).where(StreamParticipant.stream_id == stream_id, Submission.task_id == task_id))).all())


@router.patch("/{stream_id}/tasks/{task_id}/submissions/{submission_id}")
async def grade_submission(stream_id: int, task_id: int, submission_id: int, data: GradeUpdate, curator=Depends(require_role(UserRole.curator)), db: AsyncSession = Depends(get_session)):
    await owned(stream_id, curator, db)
    item = await db.get(Submission, submission_id)
    if not item or item.task_id != task_id: raise HTTPException(404, "Submission not found")
    item.grade, item.feedback_message = data.grade, data.feedback_message
    await db.commit(); await db.refresh(item); return item


@router.delete("/{stream_id}/tasks/{task_id}/submissions/{submission_id}/file")
async def reject_submission_file(stream_id: int, task_id: int, submission_id: int, reason: str, curator=Depends(require_role(UserRole.curator)), db: AsyncSession = Depends(get_session)):
    await owned(stream_id, curator, db)
    item = await db.get(Submission, submission_id)
    if not item or item.task_id != task_id: raise HTTPException(404, "Submission not found")
    if not reason.strip(): raise HTTPException(422, "A rejection reason is required")
    if item.file_id:
        path = Path("uploads") / Path(item.file_id).name
        if path.exists(): path.unlink()
        item.file_id = None
    item.grade, item.feedback_message = -1, reason
    await db.commit()
    return {"status": "file_removed", "reason": reason}
