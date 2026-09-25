from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import get_current_user, require_role
from backend.app.db import get_session
from backend.app.models import Course, Stream, StreamParticipant, User, UserRole
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
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Account curates existing streams; ask an admin to reassign them first")


@router.get("/users/leaderboard")
async def leaderboard(
    _user=Depends(get_current_user), db: AsyncSession = Depends(get_session)
):
    from backend.app.models import User, UserRole, Submission, StreamParticipant, Stream, Task
    from sqlalchemy import func

    students = (
        await db.scalars(select(User).where(User.role == UserRole.student))
    ).all()

    leaderboard_data = []
    for s in students:
        sub_stmt = (
            select(Submission.task_id, func.max(Submission.grade))
            .join(Task, Task.id == Submission.task_id)
            .where(Submission.user_id == s.id, Submission.grade >= 50,
                   (Task.type != "code_test") | (Submission.grade == 100))
            .group_by(Submission.task_id)
        )
        sub_rows = (await db.execute(sub_stmt)).all()
        xp = sum(row[1] for row in sub_rows)
        completed_count = len(sub_rows)

        stream_names = list(
            (
                await db.scalars(
                    select(Stream.name)
                    .join(StreamParticipant, StreamParticipant.stream_id == Stream.id)
                    .where(
                        StreamParticipant.user_id == s.id,
                        StreamParticipant.status == "accepted",
                    )
                )
            ).all()
        )

        if xp >= 250:
            league = "Diamond"
            league_title = "Алмазная лига"
        elif xp >= 150:
            league = "Platinum"
            league_title = "Платиновая лига"
        elif xp >= 80:
            league = "Gold"
            league_title = "Золотая лига"
        else:
            league = "Silver"
            league_title = "Серебряная лига"

        leaderboard_data.append(
            {
                "user_id": s.id,
                "username": s.username,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "full_name": f"{s.first_name} {s.last_name}".strip() or s.username,
                "xp": xp,
                "total_xp": xp,
                "tasks_completed": completed_count,
                "streak_days": None,
                "league": league,
                "league_title": league_title,
                "league_name": league_title,
                "streams": stream_names,
                "primary_stream": stream_names[0]
                if stream_names
                else "IT TOP Academy",
            }
        )

    leaderboard_data.sort(key=lambda x: (x["xp"], x["tasks_completed"]), reverse=True)
    for idx, item in enumerate(leaderboard_data):
        item["rank"] = idx + 1

    return leaderboard_data


@router.get("/users/me/broadcasts")
async def my_broadcasts(
    user=Depends(get_current_user), db: AsyncSession = Depends(get_session)
):
    from backend.app.models import Broadcast, StreamBroadcast, Stream, StreamParticipant, User

    if user.role == UserRole.student:
        stmt = (
            select(Broadcast, Stream, User)
            .join(StreamBroadcast, StreamBroadcast.broadcast_id == Broadcast.id)
            .join(Stream, Stream.id == StreamBroadcast.stream_id)
            .join(StreamParticipant, StreamParticipant.stream_id == Stream.id)
            .outerjoin(User, User.id == Broadcast.curator_id)
            .where(
                StreamParticipant.user_id == user.id,
                StreamParticipant.status == "accepted",
            )
            .order_by(Broadcast.timestamp.desc())
        )
    elif user.role == UserRole.curator:
        stmt = (
            select(Broadcast, Stream, User)
            .join(StreamBroadcast, StreamBroadcast.broadcast_id == Broadcast.id)
            .join(Stream, Stream.id == StreamBroadcast.stream_id)
            .outerjoin(User, User.id == Broadcast.curator_id)
            .where(Broadcast.curator_id == user.id)
            .order_by(Broadcast.timestamp.desc())
        )
    else:
        stmt = (
            select(Broadcast, Stream, User)
            .join(StreamBroadcast, StreamBroadcast.broadcast_id == Broadcast.id)
            .join(Stream, Stream.id == StreamBroadcast.stream_id)
            .outerjoin(User, User.id == Broadcast.curator_id)
            .order_by(Broadcast.timestamp.desc())
        )

    res = await db.execute(stmt)
    items = []
    for b, s, u in res.all():
        text_lower = b.text.lower()
        is_urgent = any(k in text_lower for k in ("дедлайн", "внимание", "срочно", "важно"))
        category = "urgent" if is_urgent else ("webinar" if "вебинар" in text_lower else ("analytics" if "статистика" in text_lower or "рейтинг" in text_lower else "update"))
        author = f"{u.first_name} {u.last_name}".strip() if u else "Куратор"
        
        # Build concise title
        first_sentence = b.text.split(".")[0].strip()
        title = first_sentence if len(first_sentence) <= 60 else (first_sentence[:57] + "...")
        
        items.append(
            {
                "id": b.id,
                "text": b.text,
                "content": b.text,
                "title": title,
                "timestamp": b.timestamp.isoformat() if b.timestamp else None,
                "created_at": b.timestamp.isoformat() if b.timestamp else None,
                "stream_id": s.id if s else None,
                "stream_name": s.name if s else "Общий канал",
                "curator_name": author,
                "author_name": author,
                "category": category,
                "priority": "high" if is_urgent else "normal",
                "is_urgent": is_urgent,
            }
        )
    return items


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


@router.get("/users/me/streams")
async def my_streams(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if user.role == UserRole.curator:
        stmt = (
            select(Stream, Course)
            .join(Course, Course.id == Stream.course_id)
            .where(Stream.curator_id == user.id)
            .order_by(Stream.id)
        )
    elif user.role == UserRole.admin:
        stmt = (
            select(Stream, Course)
            .join(Course, Course.id == Stream.course_id)
            .order_by(Stream.id)
        )
    else:
        stmt = (
            select(Stream, Course)
            .join(Course, Course.id == Stream.course_id)
            .join(StreamParticipant, StreamParticipant.stream_id == Stream.id)
            .where(StreamParticipant.user_id == user.id, StreamParticipant.status == "accepted")
            .order_by(Stream.id)
        )
    rows = await db.execute(stmt)
    return [
        {
            "stream_id": s.id,
            "stream_name": s.name,
            "start_date": s.start_date,
            "end_date": s.end_date,
            "course_id": c.id,
            "course_title": c.title,
            "course_description": c.description,
            "course_type": c.type,
            "course_grades": c.grades,
            "course_volume": c.volume,
            "course_tool": c.tool,
            "course_goal": c.goal,
        }
        for s, c in rows.all()
    ]


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

    item = await db.get(StreamRating, user.id)
    return item or {"user_id": user.id, "rating": 0.0}


@router.get("/users/me/history")
async def history(
    user=Depends(get_current_user), db: AsyncSession = Depends(get_session)
):
    from backend.app.models import Submission, Task, Lesson, course_modules

    course_id_query = (
        select(course_modules.c.course_id)
        .join(Lesson, Lesson.module_id == course_modules.c.module_id)
        .where(Lesson.id == Task.lesson_id)
        .limit(1)
        .correlate(Task)
        .scalar_subquery()
    )
    stmt = (
        select(Submission, Task, course_id_query)
        .join(Task, Task.id == Submission.task_id)
        .where(Submission.user_id == user.id)
        .order_by(Submission.id.desc())
    )
    rows = await db.execute(stmt)
    return [
        {
            "id": sub.id,
            "task_id": sub.task_id,
            "course_id": course_id,
            "task_type": str(tsk.type.value if hasattr(tsk.type, "value") else tsk.type),
            "task_description": tsk.description,
            "input": sub.input,
            "file_id": sub.file_id,
            "grade": sub.grade,
            "feedback_message": sub.feedback_message,
        }
        for sub, tsk, course_id in rows.all()
    ]
