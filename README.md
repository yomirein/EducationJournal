# PixelStart — учебная платформа программирования

Веб-платформа по базовому пакету учебного содержания: Scratch 3 (2–4 классы), Minecraft Education с MakeCode (3–6 классы), Python 3 (5–9 классы). В демо-базе 3 курса, 9 модулей и 30 учебных шагов: теория, вопросы, практика, проекты и задачи с тестами.

Один FastAPI-процесс отдаёт и API, и страницы фронтенда с одного адреса. База данных — PostgreSQL.

## Стек

- **Бэкенд:** Python 3.12+, FastAPI, SQLAlchemy 2 (async, asyncpg), Alembic, Pydantic v2
- **База:** PostgreSQL 16
- **Фронтенд:** статический HTML + ванильный JS без сборки (`front/`)
- **Инфраструктура:** Docker Compose (сервисы `db` и `api`)

## Структура

```
EducationJournal/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py              # Текущий пользователь, проверка ролей
│   │   │   └── endpoints/           # auth, users, courses, streams, panel, files, schedule
│   │   ├── core/                    # config, security (JWT, пароли), email, rate_limit
│   │   ├── fixtures/
│   │   │   └── case_curriculum.json # Учебная программа для демо-засева
│   │   ├── db.py                    # Подключение к БД
│   │   ├── evaluator.py             # Автопроверка ответов и запуск Python-кода
│   │   ├── main.py                  # Точка входа FastAPI: роутеры + раздача front/
│   │   ├── models.py                # Модели SQLAlchemy
│   │   ├── repositories.py          # Слой запросов к БД
│   │   ├── schemas.py               # Pydantic-схемы запросов и ответов
│   │   └── services.py              # Бизнес-логика (регистрация, вход, профиль)
│   ├── migrations/                  # Миграции Alembic
│   ├── scripts/
│   │   ├── seed.py                  # Демо-засев (удаляет учебные данные!)
│   │   └── generate_curriculum_fixtures.py
│   ├── tests/
│   │   ├── test_curriculum.py       # Юнит-тесты программы и оценивания
│   │   └── manual/                  # Скрипты, которым нужен запущенный сервер
│   ├── alembic.ini
│   └── requirements.txt
├── front/
│   ├── assets/                      # api.js (API-клиент), app.js (логика страниц), styles.css
│   ├── auth/                        # Вход, регистрация, подтверждение почты
│   ├── student/                     # Кабинет ученика
│   ├── curator/                     # Кабинет куратора
│   ├── admin/                       # Администрирование
│   └── simulators/                  # Scratch и тренировочный Minecraft-мир
├── docs/
│   ├── email/                       # Настройка и проверка email
│   ├── case_document_full.md        # Исходный текст учебного пакета
│   ├── roadmap.md
│   └── todo.yml
├── .env.example
├── Dockerfile
└── docker-compose.yml
```

> Все команды ниже выполняются **из корня репозитория**: оттуда читается `.env`, и Python-пакет `backend` доступен для импорта.

## Вариант 1. Всё в Docker (проще всего)

Нужен только Docker с Compose.

```bash
cp .env.example .env
# Откройте .env и замените SECRET_KEY на длинную случайную строку, например:
#   python3 -c "import secrets; print(secrets.token_urlsafe(48))"
docker compose up --build -d
# Демо-данные (только для пустой базы):
docker compose exec -e PIXELSTART_ALLOW_DEMO_SEED=1 api python -m backend.scripts.seed
```

Откройте http://127.0.0.1:8000/. Миграции контейнер `api` применяет сам при старте. Внутри Compose `DATABASE_URL` указывает на хост `db` (задано в `docker-compose.yml`), поэтому значение из `.env` для контейнера не используется.

Остановить: `docker compose down`. Удалить вместе с данными базы: `docker compose down -v`.

## Вариант 2. Бэкенд локально, PostgreSQL в Docker

Удобно для разработки с автоперезагрузкой. Нужны Python 3.12+ и Docker.

```bash
# 1. База
docker compose up -d db

# 2. Окружение Python
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt

# 3. Настройки
cp .env.example .env
# Замените SECRET_KEY. DATABASE_URL по умолчанию уже указывает на базу из шага 1:
#   postgresql+asyncpg://postgres:postgres@localhost:5432/learning

# 4. Схема базы
alembic -c backend/alembic.ini upgrade head

# 5. Демо-данные (только для пустой базы)
PIXELSTART_ALLOW_DEMO_SEED=1 python -m backend.scripts.seed

# 6. Сервер
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Сайт: http://127.0.0.1:8000/, Swagger: http://127.0.0.1:8000/docs.

Если у вас уже есть свой PostgreSQL, пропустите шаг 1 и укажите в `.env` `DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DBNAME`. База должна существовать заранее (`createdb learning`).

### Демо-аккаунты

Создаются только командой засева. На главной и на странице входа есть кнопки быстрого входа — они показываются только на `localhost`/`127.0.0.1`.

| Роль | Логин | Пароль |
|---|---|---|
| Ученик | `student` | `student12345` |
| Куратор | `curator` | `curator12345` |
| Админ | `admin` | `admin12345` |

**Не запускайте засев на рабочей базе**: он удаляет курсы, потоки, работы и объявления. Демо-пароли нельзя использовать в публичном развёртывании.

### Первый администратор без засева

Задайте в `.env` `FIRST_ADMIN_USERNAME`, `FIRST_ADMIN_EMAIL`, `FIRST_ADMIN_PASSWORD` (и при желании `FIRST_ADMIN_FIRST_NAME`, `FIRST_ADMIN_LAST_NAME`). При старте приложение создаст администратора, только если в базе ещё нет ни одного.

## Частые проблемы при первом запуске

| Симптом | Причина и решение |
|---|---|
| `ValidationError: secret_key Field required` | Нет `.env` в корне или в нём нет `SECRET_KEY`. Выполните `cp .env.example .env`, команды запускайте из корня. |
| `ModuleNotFoundError: No module named 'backend'` | Команда запущена не из корня или без `-m` (нужно `python -m backend.scripts.seed`, а не `python backend/scripts/seed.py`). |
| `connection refused` на 5432 | База не запущена: `docker compose up -d db`, проверка — `docker compose ps`. |
| `port is already allocated` для 5432 или 8000 | Порт занят локальным PostgreSQL или другим сервером. Остановите его или поменяйте левую часть `ports` в `docker-compose.yml` (и порт в `DATABASE_URL`). |
| `database "learning" does not exist` | Для своего PostgreSQL создайте базу: `createdb learning`. |
| Ответ `429 Too many requests` | Сработал лимит на `/auth/*` (например, 20 входов в минуту с одного IP). Подождите минуту. |

## Email-подтверждение регистрации

Письма отправляются через SMTP в фоне. Без SMTP-настроек регистрация работает, письма просто не отправляются (в логе будет `[email] Skipping email`).

```env
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=youremail@gmail.com
MAIL_PASSWORD=<app-password>
MAIL_FROM=youremail@gmail.com
MAIL_STARTTLS=True
FRONTEND_URL=http://127.0.0.1:8000
```

Ссылка в письме ведёт на `{FRONTEND_URL}/auth/verify.html?token=...`; страница сама вызывает `POST /auth/verify-email` и позволяет отправить письмо повторно. Подробности и настройка других почтовых сервисов — `docs/email/EMAIL_SETUP.md`.

## Проверки

```bash
# Юнит-тесты программы и оценивания (сервер не нужен)
python -m unittest discover -s backend/tests -t . -v

# Синтаксис
python -m compileall -q backend
node --check front/assets/app.js
node --check front/simulators/scratch-ru/js/app.js
```

Скрипты в `backend/tests/manual/` работают с запущенным сервером и нужен пакет `requests` (`pip install requests`). Адрес сервера задаётся `API_BASE` (по умолчанию `http://127.0.0.1:8000`).

```bash
# Smoke-тест API: создаёт пользователей и меняет роли — только на демо-базе
PIXELSTART_ALLOW_API_SMOKE=1 python -m backend.tests.manual.api_smoke

# Проверка email-подтверждения
python -m backend.tests.manual.mail_check
```

`api_smoke` входит администратором `admin`/`admin12345` из демо-засева; для другого администратора задайте `FIRST_ADMIN_USERNAME` и `FIRST_ADMIN_PASSWORD`.

Вручную перед показом проверьте светлую и тёмную темы, ширину телефона и планшета, ответы с одним и несколькими вариантами, Scratch в развёрнутом и обычном виде, Python на открытых и скрытых тестах и очередь ручной проверки.

## Как устроено обучение

- **Ученик:** каталог → курс → модуль → урок → задание → результат в журнале. Прогресс и XP вычисляются из сохранённых работ. Для задач Python зачёт требует прохождения всех тестов; проекты ждут рецензии куратора.
- **Scratch:** встроенная лаборатория содержит примеры «Мяч к центру», «Из квадрата в треугольник», «Кот по кругу» и редактируемую игру «Поймай яблоко». Для проектных шагов ученик публикует собственный проект на Scratch и отправляет ссылку.
- **Minecraft Education:** встроенный воксельный симулятор предназначен для тренировки. Для зачёта нужен проект MakeCode и скриншот из Minecraft Education; их проверяет куратор.
- **Python:** ученик проверяет решение на открытых примерах, затем сдаёт его на полный набор тестов. Эталонные решения, критерии куратора и скрытые тесты не входят в ответы API ученика.
- **Куратор:** видит очередь работ своих потоков, оценивает их и отправляет объявления.
- **Админ:** создаёт курсы, уроки, задания и потоки, управляет ролями и оплатой пользователей, имеет доступ ко всем потокам.

Программа хранится в `backend/app/fixtures/case_curriculum.json`. Её можно пересобрать из `docs/case_document_full.md`:

```bash
python -m backend.scripts.generate_curriculum_fixtures
```

Пересборка фикстуры **не** меняет базу — для этого нужен повторный засев.

## Изменение схемы базы

```bash
# После правки backend/app/models.py:
alembic -c backend/alembic.ini revision --autogenerate -m "short description"
alembic -c backend/alembic.ini upgrade head
```

Проверьте сгенерированный файл в `backend/migrations/versions/` перед коммитом.

## Границы текущей архитектуры

- Python-код учеников запускается в отдельном процессе с лимитами и белым списком конструкций. Для публичного сервиса с недоверенными пользователями вынесите запуск в изолированные контейнеры без сети и доступа к файлам хоста.
- Лимитер запросов хранит счётчики в памяти процесса. При нескольких воркерах или инстансах нужен общий store (например, Redis).
- Скрытые тесты лежат в репозитории вместе с демо-фикстурами. Для честного публичного соревнования храните их в закрытом контуре.
- Загруженные файлы раздаются по `/uploads/<uuid>` без проверки прав: доступ держится на неугадываемом имени файла.
