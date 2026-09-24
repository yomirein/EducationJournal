"""Comprehensive database seeder for EducationJournal.

Populates:
1. Roles and Demo Users:
   - admin: admin@it-top.ru / admin12345
   - curator: curator@it-top.ru / curator12345
   - student: student@it-top.ru / student12345
2. Full official curriculum from 'Базовый пакет учебного содержания':
   - 3 Courses with Passports (grades, volume, tool, goal)
   - 9 Modules
   - 30 Steps (Theory, Quiz, Scratch, Minecraft Education, Code Test, Project)
   - Detailed teacher criteria, test cases, options, and reference solutions
3. Active streams and accepted student enrollments
4. Interactive pending submissions for curator live review demonstration
"""
import asyncio
import json
import os
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete
from backend.app.db import SessionLocal
from backend.app.models import (
    User, UserRole, Course, Module, Lesson, Task,
    Stream, StreamParticipant, StreamRating, Submission, course_modules,
    Broadcast, StreamBroadcast
)
from backend.app.core.security import hash_password


async def seed():
    fixtures_path = os.path.join(os.path.dirname(__file__), "backend/app/fixtures/case_curriculum.json")
    if not os.path.exists(fixtures_path):
        print("Ошибка: файл case_curriculum.json не найден. Сначала сгенерируйте фикстуры.")
        return

    with open(fixtures_path, "r", encoding="utf-8") as f:
        curriculum_data = json.load(f)

    async with SessionLocal() as db:
        print("Очистка предыдущих учебных данных для чистого перезапуска...")
        await db.execute(delete(StreamBroadcast))
        await db.execute(delete(Broadcast))
        await db.execute(delete(Submission))
        await db.execute(delete(StreamParticipant))
        await db.execute(delete(StreamRating))
        await db.execute(delete(Stream))
        await db.execute(delete(Task))
        await db.execute(delete(Lesson))
        await db.execute(delete(course_modules))
        await db.execute(delete(Module))
        await db.execute(delete(Course))

        # Check or create users
        print("Инициализация пользователей...")
        admin = await db.scalar(select(User).where(User.username == "admin"))
        if not admin:
            admin = User(
                first_name="Георгий",
                last_name="Админов",
                username="admin",
                email="admin@it-top.ru",
                password_hash=hash_password("admin12345"),
                role=UserRole.admin,
                payment=True,
                description="Главный администратор платформы"
            )
            db.add(admin)

        curator = await db.scalar(select(User).where(User.username == "curator"))
        if not curator:
            curator = User(
                first_name="Анна",
                last_name="Кураторова",
                username="curator",
                email="curator@it-top.ru",
                password_hash=hash_password("curator12345"),
                role=UserRole.curator,
                payment=True,
                description="Куратор потоков по направлению Scratch, Minecraft и Python"
            )
            db.add(curator)

        student = await db.scalar(select(User).where(User.username == "student"))
        if not student:
            student = User(
                first_name="Иван",
                last_name="Учеников",
                username="student",
                email="student@it-top.ru",
                password_hash=hash_password("student12345"),
                role=UserRole.student,
                payment=True,
                description="Ученик олимпиадного направления"
            )
            db.add(student)

        await db.flush()

        print(f"Загрузка {len(curriculum_data)} курсов из базового пакета кейса...")
        now = datetime.now(timezone.utc)
        created_streams = []

        all_created_tasks = []

        for c_data in curriculum_data:
            course = Course(
                title=c_data["title"],
                description=f"Курс для {c_data.get('grades', '')}. {c_data.get('goal', '')}",
                type=c_data["type"],
                grades=c_data.get("grades"),
                volume=c_data.get("volume"),
                tool=c_data.get("tool"),
                goal=c_data.get("goal")
            )
            db.add(course)
            await db.flush()

            # Create default stream for each course
            stream = Stream(
                course_id=course.id,
                curator_id=curator.id,
                name=f"Осенний поток: {course.title}",
                start_date=now - timedelta(days=5),
                end_date=now + timedelta(days=60)
            )
            db.add(stream)
            created_streams.append(stream)
            await db.flush()

            # Enroll student in the stream
            participant = StreamParticipant(
                user_id=student.id,
                stream_id=stream.id,
                status="accepted",
                user_stream_rating=85.0
            )
            db.add(participant)

            for m_pos, m_data in enumerate(c_data["modules"]):
                module = Module(
                    name=f"Модуль {m_data['module_num']}. {m_data['name']}",
                    description=f"Тематический блок {m_data['module_num']} по курсу '{course.title}'"
                )
                db.add(module)
                await db.flush()

                # Link course and module
                await db.execute(course_modules.insert().values(
                    course_id=course.id,
                    module_id=module.id,
                    position=m_pos
                ))

                # Lesson container for the module
                lesson = Lesson(
                    module_id=module.id,
                    type="standard_lesson",
                    duration=40
                )
                db.add(lesson)
                await db.flush()

                for s_pos, s_data in enumerate(m_data["steps"]):
                    answer_json = {
                        "step_number": s_data["step_num"],
                        "title": s_data["title"],
                        "step_type": s_data["step_type"],
                        "step_type_raw": s_data.get("step_type_raw"),
                        "check_type_raw": s_data.get("check_type_raw"),
                        "submit_type_raw": s_data.get("submit_type_raw"),
                        "options": s_data.get("options", []),
                        "correct_answers": s_data.get("correct_answers", []),
                        "is_multiple": s_data.get("is_multiple", False),
                        "number_answer": s_data.get("number_answer"),
                        "hint": s_data.get("hint"),
                        "time_limit": s_data.get("time_limit", "1.0 с"),
                        "memory_limit": s_data.get("memory_limit", "256 МБ"),
                        "sample_tests": s_data.get("sample_tests", []),
                        "hidden_tests": s_data.get("hidden_tests", []),
                        "reference_solution": s_data.get("reference_solution"),
                        "criteria": s_data.get("criteria")
                    }

                    task = Task(
                        lesson_id=lesson.id,
                        title=s_data["title"],
                        step_number=s_data["step_num"],
                        type=s_data["step_type"],
                        check_type=s_data.get("check_type_raw"),
                        submit_type=s_data.get("submit_type_raw"),
                        order_index=s_pos,
                        description=s_data["description"],
                        answer_json=answer_json
                    )
                    db.add(task)
                    all_created_tasks.append(task)

            await db.flush()

        # Seed sample demo submissions for curator review testing
        print("Создание демонстрационных сданных работ для проверки куратором...")
        
        # 1. Scratch Project pending review (Step 1.3.3)
        scratch_project_task = next((t for t in all_created_tasks if t.step_number == "1.3.3"), None)
        if scratch_project_task:
            sub1 = Submission(
                task_id=scratch_project_task.id,
                user_id=student.id,
                input="https://scratch.mit.edu/projects/1049281745/\n\nИгра 'Поймай яблоко' собрана. Чаша двигается стрелками влево и вправо, яблоко падает со случайных координат X от -220 до 220. Добавлены переменная 'Очки' и звук при ловле.",
                file_id=None,
                grade=-1,
                feedback_message=None
            )
            db.add(sub1)

        # 2. Minecraft Education pending review (Step 2.1.3)
        mc_task = next((t for t in all_created_tasks if t.step_number == "2.1.3"), None)
        if mc_task:
            sub2 = Submission(
                task_id=mc_task.id,
                user_id=student.id,
                input="https://makecode.com/_AbCdEf12345\n\nСкриншот: /uploads/minecraft_agent_path_step213.png\nАгент успешно замостил дорожку 10 блоков булыжником и повернулся лицом ко мне.",
                file_id="/uploads/minecraft_agent_path_step213.png",
                grade=-1,
                feedback_message=None
            )
            db.add(sub2)

        # 3. Code test already completed with 100 points (Step 3.1.3)
        py_task = next((t for t in all_created_tasks if t.step_number == "3.1.3"), None)
        if py_task:
            sub3 = Submission(
                task_id=py_task.id,
                user_id=student.id,
                input="a, b = map(int, input().split())\nprint(a + b)",
                file_id=None,
                grade=100,
                feedback_message="Все тесты успешно пройдены (6/6). Полный балл! Решение принято."
            )
            db.add(sub3)

        # 4. Seed realistic peer students for competitive leaderboard
        peers_data = [
            ("alex_coder", "Алексей", "Смирнов", 4),
            ("maria_dev", "Мария", "Ковалёва", 3),
            ("timur_pro", "Тимур", "Гасанов", 2),
            ("sofi_code", "София", "Лебедева", 2),
            ("artem_bot", "Артём", "Новиков", 1),
        ]
        
        for username, fname, lname, solved_count in peers_data:
            peer = await db.scalar(select(User).where(User.username == username))
            if not peer:
                peer = User(
                    username=username,
                    email=f"{username}@it-top.ru",
                    first_name=fname,
                    last_name=lname,
                    password_hash=hash_password("student12345"),
                    role=UserRole.student,
                )
                db.add(peer)
                await db.flush()

            for s in created_streams:
                part = await db.scalar(
                    select(StreamParticipant).where(
                        StreamParticipant.stream_id == s.id,
                        StreamParticipant.user_id == peer.id
                    )
                )
                if not part:
                    db.add(StreamParticipant(stream_id=s.id, user_id=peer.id, status="accepted"))

            for i in range(solved_count):
                if i < len(all_created_tasks):
                    t = all_created_tasks[i]
                    sub_exists = await db.scalar(
                        select(Submission).where(
                            Submission.task_id == t.id,
                            Submission.user_id == peer.id
                        )
                    )
                    if not sub_exists:
                        db.add(Submission(
                            task_id=t.id,
                            user_id=peer.id,
                            grade=100,
                            input="# Решение зачтено в автоматическом режиме",
                            feedback_message="Автопроверка: 100/100"
                        ))

        # 5. Seed Stream Broadcasts from Curator
        b1 = Broadcast(
            curator_id=curator.id,
            text="В курсе Python доступны задачи с открытыми примерами и скрытыми тестами. Проверяйте решение на примерах перед сдачей.",
            timestamp=datetime.now(timezone.utc) - timedelta(hours=2)
        )
        b2 = Broadcast(
            curator_id=curator.id,
            text="Задания Minecraft Education выполняются в MakeCode. Для проверки отправьте ссылку на проект и скриншот мира.",
            timestamp=datetime.now(timezone.utc) - timedelta(hours=14)
        )
        b3 = Broadcast(
            curator_id=curator.id,
            text="В курсе Scratch откройте готовый пример, измените блоки и поделитесь ссылкой на собственный проект.",
            timestamp=datetime.now(timezone.utc) - timedelta(days=1, hours=3)
        )
        db.add_all([b1, b2, b3])
        await db.flush()

        if len(created_streams) >= 3:
            db.add(StreamBroadcast(stream_id=created_streams[2].id, broadcast_id=b1.id))
            db.add(StreamBroadcast(stream_id=created_streams[1].id, broadcast_id=b2.id))
            db.add(StreamBroadcast(stream_id=created_streams[0].id, broadcast_id=b3.id))
        elif len(created_streams) > 0:
            db.add(StreamBroadcast(stream_id=created_streams[0].id, broadcast_id=b1.id))

        await db.commit()
        print(f"Успешно сохранено: 3 курса, 9 модулей, {len(all_created_tasks)} шагов!")
        print("База данных готова к полномасштабной презентации жюри.")


if __name__ == "__main__":
    if os.getenv("PIXELSTART_ALLOW_DEMO_SEED") != "1":
        raise SystemExit("Демо-засев удаляет существующие учебные данные. Для пустой тестовой БД задайте PIXELSTART_ALLOW_DEMO_SEED=1.")
    asyncio.run(seed())
