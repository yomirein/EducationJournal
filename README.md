# Learning Platform API - Инструкция по запуску

Платформа для управления онлайн-обучением на FastAPI с асинхронным взаимодействием с PostgreSQL.

## Предварительные требования

- Docker и Docker Compose установлены на вашей машине
- Git для клонирования репозитория

## Быстрый старт

1. **Клонируйте репозиторий**:
```bash
git clone <repository-url>
cd EducationJournal
```

2. **Убедитесь, что файл `.env` существует** в корне проекта со следующими параметрами:
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/learning
SECRET_KEY=replace-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE=30
REFRESH_TOKEN_EXPIRE=10080
UPLOAD_DIR=uploads

# Первый администратор — создаётся автоматически при старте, если нет ни одного admin
FIRST_ADMIN_USERNAME=admin
FIRST_ADMIN_EMAIL=admin@example.com
FIRST_ADMIN_PASSWORD=supersecret123
FIRST_ADMIN_FIRST_NAME=Admin
FIRST_ADMIN_LAST_NAME=Admin
```

> ⚠️ **Важно**: В продакшене обязательно замените `SECRET_KEY` и `FIRST_ADMIN_PASSWORD` на надёжные значения!

При первом запуске, если в базе нет ни одного пользователя с ролью `admin`, приложение автоматически создаст администратора по данным из `.env`. Если переменные `FIRST_ADMIN_*` не заданы — этот шаг пропускается.

3. **Запустите все сервисы**:
```bash
docker compose up --build
```

Эта команда:
- Скачает и запустит PostgreSQL 16
- Соберет Docker-образ для API
- Автоматически выполнит миграции базы данных
- Запустит API-сервер на порту 8000

## Доступ к сервисам

После успешного запуска:

- **API**: http://localhost:8000
- **Интерактивная документация (Swagger)**: http://localhost:8000/docs
- **Альтернативная документация (ReDoc)**: http://localhost:8000/redoc
- **База данных PostgreSQL**: `localhost:5432`
  - Пользователь: `postgres`
  - Пароль: `postgres`
  - База: `learning`

## Основные команды

### Запуск в фоновом режиме
```bash
docker compose up -d
```

### Просмотр логов
```bash
docker compose logs -f        # все сервисы
docker compose logs -f api    # только API
docker compose logs -f db     # только база данных
```

### Остановка всех сервисов
```bash
docker compose down
```

### Перезапуск конкретного сервиса
```bash
docker compose restart api
```

### Пересборка после изменения кода
```bash
docker compose up --build
```

## Работа с базой данных

### Подключение к PostgreSQL
```bash
docker compose exec db psql -U postgres -d learning
```

### Создание новой миграции
```bash
docker compose exec api alembic revision --autogenerate -m "описание изменений"
```

### Применение миграций вручную
```bash
docker compose exec api alembic upgrade head
```

### Откат миграций
```bash
docker compose exec api alembic downgrade -1
```

## Разработка

### Изменение кода
При изменении Python-кода необходимо перезапустить API-контейнер:
```bash
docker compose restart api
```

Или пересобрать образ:
```bash
docker compose up --build api
```

### Доступ к загруженным файлам
Файлы, загруженные через API, сохраняются в папке `./uploads` на хосте и доступны через `/uploads/` в API.

### Очистка данных
Для полной очистки базы данных и томов:
```bash
docker compose down -v
```

> ⚠️ **Внимание**: Эта команда удалит все данные из базы!

## Устранение неполадок

### Контейнеры не запускаются
Проверьте логи:
```bash
docker compose logs
```

### Ошибка подключения к базе данных
Убедитесь, что:
1. В `.env` параметр `DATABASE_URL` использует хост `db`, а не `localhost`
2. Контейнер базы данных запущен: `docker compose ps`

### Порт уже занят
Если порт 8000 или 5432 уже используется другим приложением:
- Остановите конфликтующее приложение
- Или измените порты в `docker-compose.yml`

### Миграции не применяются
Выполните миграции вручную:
```bash
docker compose exec api alembic upgrade head
```

## Структура проекта

```
EducationJournal/
├── backend/app/          # Код приложения
│   ├── api/             # Endpoints
│   ├── core/            # Конфигурация и безопасность
│   ├── models.py        # SQLAlchemy модели
│   ├── schemas.py       # Pydantic схемы
│   ├── repositories.py  # Слой работы с БД
│   ├── services.py      # Бизнес-логика
│   └── db.py            # Подключение к БД
├── migrations/          # Alembic миграции
├── frontend/            # Фронтенд (пока не в Docker)
├── uploads/             # Загруженные файлы
├── main.py              # Точка входа FastAPI
├── Dockerfile           # Образ для API
├── docker-compose.yml   # Оркестрация сервисов
├── requirements.txt     # Python зависимости
└── .env                 # Переменные окружения
```

## Тестирование API

В корне проекта есть `test.py` — скрипт для ручной проверки основных эндпоинтов:

```bash
pip install requests
python test.py
```

Скрипт последовательно проверяет: health, регистрацию, логин всех ролей, `/users/me`, панель администратора (включая повышение роли), курсы, стримы, статистику куратора и обновление профиля.

## Поддержка

При возникновении проблем проверьте:
1. Логи контейнеров: `docker compose logs`
2. Статус контейнеров: `docker compose ps`
3. Правильность настроек в `.env`
4. Доступность портов 8000 и 5432
