from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import get_current_user
from backend.app.db import get_session
from backend.app.models import (
    Course,
    Module,
    Lesson,
    Task,
    Submission,
    Stream,
    StreamParticipant,
    UserRole,
)
from backend.app.repositories import CourseRepository
from backend.app.schemas import CourseOut

router = APIRouter(prefix="/courses", tags=["courses"])


async def has_course_access(course_id: int, user, db: AsyncSession) -> bool:
    if user.payment:
        return True
    return bool(
        await db.scalar(
            select(StreamParticipant.id)
            .join(Stream)
            .where(
                Stream.course_id == course_id,
                StreamParticipant.user_id == user.id,
                StreamParticipant.status == "accepted",
            )
        )
    )


@router.get("", response_model=list[CourseOut])
async def courses(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
):
    return await CourseRepository(db).page(limit, offset)


@router.get("/{course_id}", response_model=CourseOut)
async def course(course_id: int, db: AsyncSession = Depends(get_session)):
    item = await CourseRepository(db).get(course_id)
    if not item:
        raise HTTPException(404, "Course not found")
    return item


@router.get("/{course_id}/tasks")
async def course_tasks(
    course_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    item = await db.get(Course, course_id)
    if not item:
        raise HTTPException(404, "Course not found")
    if user.role == UserRole.student and not await has_course_access(
        course_id, user, db
    ):
        raise HTTPException(403, "Course access requires payment or enrollment")
    return list(
        (
            await db.scalars(
                select(Task)
                .join(Lesson)
                .join(Module)
                .where(Module.courses.any(id=course_id))
            )
        ).all()
    )


@router.post("/{course_id}/tasks/{task_id}/submissions", status_code=201)
async def submit(
    course_id: int,
    task_id: int,
    data: dict,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if not await db.scalar(
        select(Task.id)
        .join(Lesson)
        .join(Module)
        .where(Task.id == task_id, Module.courses.any(id=course_id))
    ):
        raise HTTPException(404, "Task not found")
    if user.role == UserRole.student and not await has_course_access(
        course_id, user, db
    ):
        raise HTTPException(403, "Course access requires payment or enrollment")
    item = await db.scalar(
        select(Submission).where(
            Submission.task_id == task_id, Submission.user_id == user.id
        )
    )
    if item is None:
        item = Submission(task_id=task_id, user_id=user.id)
        db.add(item)
    item.input, item.file_id, item.grade = data.get("input"), data.get("file_id"), 0
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/{course_id}/tasks/{task_id}/grade")
async def grade(
    course_id: int,
    task_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    item = await db.scalar(
        select(Submission).where(
            Submission.task_id == task_id, Submission.user_id == user.id
        )
    )
    if not item:
        raise HTTPException(404, "Submission not found")
    return {"grade": item.grade, "feedback_message": item.feedback_message}
