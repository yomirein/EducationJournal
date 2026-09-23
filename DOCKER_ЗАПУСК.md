# Инструкция по запуску приложения через Docker

## Требования

- Docker (версия 20.10 или выше)
- Docker Compose (версия 2.0 или выше)

Проверить установку:
```bash
docker --version
docker compose version
```

## Быстрый старт

1. **Клонировать репозиторий** (если ещё не клонирован):
```bash
git clone <url-репозитория>
cd EducationJournal
```

2. **Настроить переменные окружения**:
```bash
cp .env.example .env
```

Отредактировать `.env` файл при необходимости. Стандартные настройки уже работают для локального запуска.

3. **Запустить все сервисы**:
```bash
docker compose up -d
```

Эта команда:
- Соберёт Docker образ для API
- Запустит PostgreSQL базу данных
- Запустит API сервер
- Автоматически выполнит миграции базы данных

4. **Проверить статус**:
```bash
docker compose ps
```

Оба сервиса (`db` и `api`) должны быть в состоянии `Up`.

## Доступ к сервисам

- **API**: http://localhost:8000
- **API документация (Swagger)**: http://localhost:8000/docs
- **Проверка здоровья**: http://localhost:8000/health
- **База данных**: localhost:5432 (доступна для подключения через клиенты БД)

## Основные команды

### Запуск сервисов

```bash
# Запуск в фоновом режиме
docker compose up -d

# Запуск с выводом логов в терминал
docker compose up
```

### Просмотр логов

```bash
# Все сервисы
docker compose logs -f

# Только API
docker compose logs -f api

# Только база данных
docker compose logs -f db

# Последние 100 строк
docker compose logs --tail=100 api
```

### Остановка сервисов

```bash
# Остановить без удаления контейнеров
docker compose stop

# Остановить и удалить контейнеры (данные БД сохранятся)
docker compose down

# Остановить и удалить контейнеры вместе с volumes (УДАЛИТ ВСЕ ДАННЫЕ БД!)
docker compose down -v
```

### Перезапуск сервисов

```bash
# Перезапустить всё
docker compose restart

# Перезапустить только API
docker compose restart api
```

### Пересборка после изменений в коде

```bash
# Пересобрать и запустить
docker compose up -d --build

# Только пересобрать без запуска
docker compose build
```

## Работа с базой данных

### Выполнение миграций вручную

Миграции выполняются автоматически при старте API. Если нужно выполнить вручную:

```bash
docker compose exec api alembic upgrade head
```

### Создание новой миграции

```bash
docker compose exec api alembic revision --autogenerate -m "описание изменений"
```

### Откат миграции

```bash
# Откатить одну миграцию назад
docker compose exec api alembic downgrade -1

# Откатить к конкретной версии
docker compose exec api alembic downgrade <revision_id>
```

### Подключение к PostgreSQL

```bash
# Через docker
docker compose exec db psql -U postgres -d learning

# Или используя локальный psql
psql -h localhost -U postgres -d learning
```

Пароль: `postgres` (из docker-compose.yml)

## Разработка

### Просмотр содержимого контейнера API

```bash
docker compose exec api bash
```

### Установка новых зависимостей

1. Добавить пакет в `requirements.txt`
2. Пересобрать образ:
```bash
docker compose up -d --build api
```

### Просмотр переменных окружения

```bash
docker compose exec api env
```

## Устранение неполадок

### API не запускается

1. Проверить логи:
```bash
docker compose logs api
```

2. Убедиться, что база данных запущена:
```bash
docker compose ps db
```

3. Проверить подключение к БД:
```bash
docker compose exec db pg_isready -U postgres
```

### База данных не запускается

1. Проверить, не занят ли порт 5432:
```bash
lsof -i :5432
# или
netstat -an | grep 5432
```

2. Если порт занят другим PostgreSQL, остановить его или изменить порт в `docker-compose.yml`.

### Ошибка "relation does not exist"

Миграции не выполнены. Выполнить:
```bash
docker compose exec api alembic upgrade head
```

### Порт 8000 уже занят

Изменить порт в `docker-compose.yml`:
```yaml
api:
  ports: ["8080:8000"]  # Изменить 8000 на другой порт
```

Затем пересоздать контейнеры:
```bash
docker compose up -d
```

### Полный сброс (очистка всех данных)

```bash
# Остановить и удалить всё
docker compose down -v

# Удалить образы
docker compose rm -f

# Пересобрать и запустить заново
docker compose up -d --build
```

### Проблемы с правами доступа к файлам

```bash
# Если uploads папка недоступна
sudo chown -R $USER:$USER uploads/
```

## Полезные команды Docker

```bash
# Посмотреть использование ресурсов
docker stats

# Очистить неиспользуемые образы и контейнеры
docker system prune

# Посмотреть все volumes
docker volume ls

# Посмотреть детали volume
docker volume inspect educationjournal_pgdata
```

## Структура проекта

```
EducationJournal/
├── backend/           # Исходный код API
│   └── app/          # Модули приложения
├── frontend/         # Фронтенд (не запускается через Docker пока)
├── migrations/       # Alembic миграции
├── uploads/          # Загруженные файлы
├── docker-compose.yml # Конфигурация сервисов
├── Dockerfile        # Образ для API
├── requirements.txt  # Python зависимости
├── .env             # Переменные окружения (не коммитить!)
└── main.py          # Точка входа FastAPI
```

## Поддержка

При возникновении проблем:
1. Проверить логи: `docker compose logs -f`
2. Проверить статус: `docker compose ps`
3. Проверить healthcheck: `curl http://localhost:8000/health`

Ожидаемый ответ от health endpoint: `{"status":"ok"}`
