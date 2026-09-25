# PixelStart — учебная платформа программирования

Локальный веб-проект по базовому пакету учебного содержания. Программа: Scratch 3 (2–4 классы), Minecraft Education с MakeCode (3–6 классы), Python 3 (5–9 классы). В базе 3 курса, 9 модулей и 30 учебных шагов: теория, вопросы, практика, проекты и задачи с тестами.

## Быстрый запуск на компьютере

Нужны Python 3.12+, Git и PostgreSQL 16 (локально или через Docker). Проект рассчитан на PostgreSQL: миграции используют его синтаксис.

```bash
# PostgreSQL можно поднять из docker-compose:
docker compose up -d db
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
cp .env.example .env
# Замените SECRET_KEY в .env на длинный случайный ключ.
# DATABASE_URL по умолчанию: postgresql+asyncpg://postgres:postgres@localhost:5432/learning
./.venv/bin/alembic upgrade head
# Только для новой пустой демонстрационной БД:
PIXELSTART_ALLOW_DEMO_SEED=1 ./.venv/bin/python seed.py
./.venv/bin/uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Откройте [главную страницу](http://127.0.0.1:8000/) или [Swagger API](http://127.0.0.1:8000/docs). Если у вас уже есть рабочая база, **не запускайте `seed.py`**: он очищает учебные данные и создаёт демо-записи. Миграции можно применять отдельно.

Для другой базы PostgreSQL задайте в `.env` `DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DBNAME`. Не коммитьте `.env`.

Если в новой базе нужен первый администратор, задайте в `.env` `FIRST_ADMIN_USERNAME`, `FIRST_ADMIN_EMAIL`, `FIRST_ADMIN_PASSWORD`, `FIRST_ADMIN_FIRST_NAME` и `FIRST_ADMIN_LAST_NAME`. При запуске приложение создаст его, только если администраторов ещё нет. Используйте собственный длинный пароль; при отсутствии этих переменных автоматическое создание пропускается.

## Docker Compose

Один FastAPI-сервис раздаёт API и страницы с одного адреса. Отдельный Nginx не требуется.

```bash
cp .env.example .env
# Задайте собственный SECRET_KEY. DATABASE_URL для контейнера api задаётся в docker-compose.yml (хост db).
# Пароль БД можно переопределить переменной POSTGRES_PASSWORD.
docker compose up --build -d
# Только для пустой БД и локального демо:
docker compose exec -e PIXELSTART_ALLOW_DEMO_SEED=1 api python seed.py
```

Сайт: `http://127.0.0.1:8000/`. Демо-логины создаются только при явном запуске `seed.py`; быстрый вход на главной отображается только на localhost. Пароли из демонстрационного засева нельзя использовать в публичном развёртывании.

## Email-подтверждение регистрации

Платформа поддерживает подтверждение email-адресов при регистрации. Письма отправляются асинхронно через SMTP. При отсутствии SMTP-настроек регистрация работает без отправки писем.

Для настройки задайте в `.env`:

```env
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=youremail@gmail.com
MAIL_PASSWORD=<app-password>
MAIL_FROM=youremail@gmail.com
MAIL_STARTTLS=True
```

Для Gmail требуется включить 2FA и создать App Password: https://myaccount.google.com/apppasswords. Подробная инструкция по настройке различных почтовых сервисов и тестированию в `Instructions/EMAIL_SETUP.md`.

**API-эндпоинты:**
- `POST /auth/register` — регистрация с автоматической отправкой письма
- `POST /auth/verify-email?token={token}` — подтверждение email по токену (страница `front/auth/verify.html`, ссылка в письме: `{FRONTEND_URL}/auth/verify.html?token=...`)
- `POST /auth/resend-verification?email={email}` — повторная отправка письма

## Как устроено обучение

- **Ученик:** каталог → курс → модуль → урок → задание → результат в журнале. Прогресс и XP вычисляются из сохранённых работ. Для задач Python зачёт требует прохождения всех тестов; проекты ждут рецензии куратора.
- **Scratch:** встроенная лаборатория содержит примеры «Мяч к центру», «Из квадрата в треугольник», «Кот по кругу» и редактируемую игру «Поймай яблоко». Её можно развернуть и свернуть в задании. Для проектных шагов ученик публикует собственный проект на Scratch и отправляет ссылку.
- **Minecraft Education:** встроенный воксельный симулятор предназначен для тренировки. Для зачёта нужен проект MakeCode и скриншот из Minecraft Education; их проверяет куратор.
- **Python:** ученик проверяет решение на открытых примерах, затем сдаёт его на полный набор тестов. Эталонные решения, критерии куратора и скрытые тесты не входят в ответы API ученика.
- **Куратор:** видит очередь проектов, оценивает работы и отправляет объявления. Учебный план показывает порядок уроков без вымышленных дат и дедлайнов.

Содержимое программы хранится в `backend/app/fixtures/case_curriculum.json`. Исходная текстовая расшифровка пакета — `case_document_full.md`, генератор — `generate_curriculum_fixtures.py`. Повторная генерация фикстуры **не** меняет базу автоматически.

## Структура

```
EducationJournal/
├── backend/app/
│   ├── api/endpoints/       # Auth, курсы, работы, потоки, пользователи, план
│   ├── core/                # Конфигурация, безопасность, email
│   ├── fixtures/            # Программа из учебного пакета
│   ├── evaluator.py         # Проверка ответов и Python-запуск
│   ├── models.py            # Модели SQLAlchemy
│   ├── schemas.py           # Pydantic-схемы
│   ├── services.py          # Бизнес-логика
│   ├── repositories.py      # Слой работы с БД
│   └── db.py                # Подключение к БД
├── front/
│   ├── assets/              # Общие стили, API-клиент, логика страниц
│   ├── student/             # Кабинет ученика
│   ├── curator/             # Кабинет куратора
│   ├── admin/               # Администрирование
│   └── simulators/          # Scratch и тренировочный Minecraft-мир
├── migrations/              # Миграции Alembic
├── tests/                   # Проверки программы, API smoke-тесты (test.py), тест email (test_mail.py)
├── Instructions/            # Инструкции по настройке email и др.
├── main.py                  # Единый HTTP-сервер
├── seed.py                  # Разрушающий демо-засев с явным флагом
└── docker-compose.yml       # API + PostgreSQL
```

## Проверка перед показом

```bash
./.venv/bin/python -m unittest tests.test_curriculum -v
./.venv/bin/python -m compileall -q backend/app main.py seed.py
node --check front/assets/app.js
node --check front/simulators/scratch-ru/js/app.js
```

Проверяйте вручную светлую и тёмную темы, ширину телефона и планшета, ответы с одним и несколькими вариантами, Scratch в развёрнутом и обычном виде, Python на открытых и скрытых тестах и очередь ручной проверки.

`tests/test.py` дополнительно проверяет API, создаёт пользователей и меняет роли. Запускайте его только на отдельной демонстрационной базе с явным флагом `PIXELSTART_ALLOW_API_SMOKE=1`; для входа администратора задайте `FIRST_ADMIN_USERNAME` и `FIRST_ADMIN_PASSWORD` в окружении. Для этого отдельного скрипта нужен пакет `requests` (`./.venv/bin/pip install requests`).

Для проверки email-верификации:

```bash
./.venv/bin/pip install requests
./.venv/bin/python tests/test_mail.py
```

Полная инструкция по тестированию email в `Instructions/EMAIL_SETUP.md`.

Эндпоинты `/auth/login`, `/auth/register`, `/auth/verify-email` и `/auth/resend-verification` ограничены по частоте запросов с одного IP (ответ 429). Лимитер хранит счётчики в памяти процесса, поэтому при нескольких воркерах или инстансах нужен общий store (например, Redis).

## Границы текущей архитектуры

FastAPI + одна БД подходят для локального показа и небольших учебных групп. Python-код запускается в отдельном процессе с ограничениями и белым списком учебных конструкций. Для публичного сервиса с недоверенными пользователями вынесите запуск кода в отдельные контейнеры без сети и файлов хоста. Это триггер следующего этапа вместе с ростом одновременных проверок. Скрытые тесты находятся в репозитории с демо-фикстурами: для честного публичного соревнования храните их в закрытом контуре и замените опубликованный набор.
