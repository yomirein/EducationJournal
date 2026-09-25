from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import get_current_user
from backend.app.db import get_session
from backend.app.models import StreamParticipant, Stream, Submission, Task

router = APIRouter(tags=["schedule"])


@router.get("/users/me/schedule")
async def schedule(
    user=Depends(get_current_user), db: AsyncSession = Depends(get_session)
):
    from backend.app.models import Course, User, Module, Lesson, Task, Submission, course_modules

    rows = await db.execute(
        select(Stream, StreamParticipant, Course, User)
        .join(StreamParticipant, StreamParticipant.stream_id == Stream.id)
        .join(Course, Course.id == Stream.course_id)
        .outerjoin(User, User.id == Stream.curator_id)
        .where(
            StreamParticipant.user_id == user.id, StreamParticipant.status == "accepted"
        )
    )

    stream_results = []

    for s, p, c, u in rows.all():
        # Fetch lessons for this course
        l_rows = (await db.execute(
            select(Lesson, Module)
            .join(Module, Module.id == Lesson.module_id)
            .join(course_modules, course_modules.c.module_id == Module.id)
            .where(course_modules.c.course_id == c.id)
            .order_by(course_modules.c.position, Lesson.id)
        )).all()

        lessons_list = []
        for idx, (lesson, module) in enumerate(l_rows):
            tasks = (await db.scalars(
                select(Task).where(Task.lesson_id == lesson.id).order_by(Task.order_index)
            )).all()

            task_ids = [t.id for t in tasks]
            completed_tasks_count = 0
            if task_ids:
                completed_tasks_count = (await db.scalar(
                    select(func.count(func.distinct(Submission.task_id)))
                    .join(Task, Task.id == Submission.task_id)
                    .where(
                        Submission.user_id == user.id,
                        Submission.task_id.in_(task_ids),
                        Submission.grade >= 50,
                        (Task.type != "code_test") | (Submission.grade == 100),
                    )
                )) or 0

            is_completed = len(tasks) > 0 and completed_tasks_count >= len(tasks)
            status = "COMPLETED" if is_completed else "UPCOMING"

            first_task = tasks[0] if tasks else None
            action_url = f"course/tasks.html?course={c.id}&task={first_task.id}" if first_task else f"course/lessons.html?course={c.id}"

            lessons_list.append({
                "lesson_id": lesson.id,
                "lesson_number": idx + 1,
                "lesson_title": f"Урок {idx + 1}: {tasks[0].title if tasks else module.name}",
                "module_id": module.id,
                "module_name": module.name,
                "duration_minutes": lesson.duration or None,
                "date": None,
                "deadline": None,
                "time_slot": None,
                "tasks_count": len(tasks),
                "tasks_completed": completed_tasks_count,
                "status": status,
                "action_url": action_url,
                "first_task_id": first_task.id if first_task else None,
            })

        next_lesson = next((item for item in lessons_list if item["status"] != "COMPLETED"), None)
        if next_lesson:
            next_lesson["status"] = "ACTIVE"

        stream_results.append({
            "stream_id": s.id,
            "stream_name": s.name,
            "start_date": s.start_date.isoformat() if s.start_date else None,
            "end_date": s.end_date.isoformat() if s.end_date else None,
            "course_id": c.id,
            "course_title": c.title,
            "course_type": c.type,
            "curator_name": f"{u.first_name} {u.last_name}" if u else "Куратор",
            "participant_status": p.status,
            "lessons": lessons_list,
        })

    return stream_results


@router.get("/users/me/schedule/calendar")
async def schedule_calendar(
    user=Depends(get_current_user), db: AsyncSession = Depends(get_session)
):
    streams = await schedule(user=user, db=db)
    flat_lessons = []
    for s in streams:
        for l in s.get("lessons", []):
            flat_lessons.append({
                **l,
                "stream_id": s["stream_id"],
                "stream_name": s["stream_name"],
                "course_id": s["course_id"],
                "course_title": s["course_title"],
                "curator_name": s["curator_name"],
            })
    flat_lessons.sort(key=lambda x: (x["course_id"], x["lesson_number"]))
    return flat_lessons
