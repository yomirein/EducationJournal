# Инструкция по запуску с email-подтверждением

## Шаг 1: Обновите зависимости

Пересоберите Docker-образ для установки новой зависимости `fastapi-mail`:

```bash
docker compose down
docker compose up --build
```

## Шаг 2: Настройте SMTP в .env

Откройте файл `.env` и обновите секцию email verification settings:

### Вариант А: Gmail (рекомендуется для начала)

1. Включите двухфакторную аутентификацию на вашем Google-аккаунте:
   - https://myaccount.google.com/security → "2-Step Verification"

2. Создайте App Password:
   - https://myaccount.google.com/apppasswords
   - Выберите "Mail" → "Other" → введите "Learning Platform"
   - Скопируйте 16-значный пароль

3. Обновите `.env`:
```env
MAIL_USERNAME=youremail@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
MAIL_FROM=youremail@gmail.com
```

### Вариант Б: Mailtrap (для тестирования без реальной отправки)

1. Зарегистрируйтесь на https://mailtrap.io (бесплатно)
2. Создайте inbox и скопируйте SMTP credentials
3. Обновите `.env`:
```env
MAIL_SERVER=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=<mailtrap-username>
MAIL_PASSWORD=<mailtrap-password>
MAIL_FROM=noreply@example.com
MAIL_STARTTLS=True
```

### Вариант В: Без SMTP (только разработка)

Оставьте пустыми:
```env
MAIL_USERNAME=
MAIL_PASSWORD=
```
Регистрация будет работать, но письма не будут отправляться.

## Шаг 3: Перезапустите сервис

```bash
docker compose restart api
```

Или полностью пересоберите:
```bash
docker compose up --build
```

## Шаг 4: Проверьте миграции

Миграция должна применяться автоматически при старте. Проверьте логи:

```bash
docker compose logs api | grep "Running upgrade"
```

Должно быть что-то вроде:
```
INFO  [alembic.runtime.migration] Running upgrade 0001 -> 0002, add is_verified field to users
```

Если миграция не применилась, выполните вручную:
```bash
docker compose exec api alembic upgrade head
```

## Шаг 5: Тестирование

### Через Swagger UI (http://localhost:8000/docs)

1. Откройте `/auth/register` endpoint
2. Зарегистрируйте пользователя:
```json
{
  "first_name": "Иван",
  "last_name": "Петров",
  "username": "ivan",
  "email": "ivan@example.com",
  "password": "securepass123"
}
```

3. Проверьте почту (или Mailtrap inbox)
4. Скопируйте токен из ссылки в письме
5. Используйте `/auth/verify-email?token={TOKEN}`

### Через cURL

```bash
# Регистрация
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Иван",
    "last_name": "Петров",
    "username": "ivan",
    "email": "ivan@example.com",
    "password": "securepass123"
  }'

# Проверка статуса (после логина)
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "ivan", "password": "securepass123"}'

# Используйте access_token для проверки is_verified
curl http://localhost:8000/users/me \
  -H "Authorization: Bearer {ACCESS_TOKEN}"
```

## Шаг 6: Проверка работы

После верификации email в ответе `/users/me` должно быть:
```json
{
  "id": 1,
  "first_name": "Иван",
  "last_name": "Петров",
  "username": "ivan",
  "email": "ivan@example.com",
  "is_verified": true,
  ...
}
```

## Устранение проблем

### Письма не приходят

1. Проверьте логи:
```bash
docker compose logs api | grep email
```

2. Убедитесь, что `MAIL_USERNAME` и `MAIL_PASSWORD` заполнены в `.env`

3. Проверьте, что App Password создан корректно (для Gmail)

### Ошибка "Invalid credentials" при отправке

- Gmail: убедитесь, что используете App Password, а не обычный пароль
- Проверьте, что 2FA включена на аккаунте

### Ошибка подключения к SMTP

- Проверьте `MAIL_SERVER` и `MAIL_PORT`
- Для Gmail используйте порт 587 с `MAIL_STARTTLS=True`
- Для других сервисов с SSL используйте порт 465 с `MAIL_SSL_TLS=True`

### Токен истёк

Токен действителен 24 часа. Используйте `/auth/resend-verification`:
```bash
curl -X POST "http://localhost:8000/auth/resend-verification?email=ivan@example.com"
```

## Готово!

Теперь ваша платформа полностью поддерживает email-подтверждение при регистрации.

Для продакшена не забудьте:
- Использовать надёжный SMTP-сервис (SendGrid, AWS SES, Mailgun)
- Обновить `FRONTEND_URL` на реальный домен
- Заменить `SECRET_KEY` на криптографически стойкий ключ
