# Быстрая справка: Email-подтверждение

## Что было добавлено

✅ Email-подтверждение регистрации пользователей  
✅ Асинхронная отправка писем через SMTP  
✅ JWT-токены с TTL 24 часа  
✅ HTML-письмо на русском языке  
✅ Graceful fallback при отсутствии SMTP  

## Файлы

### Изменены (8):
- `backend/app/models.py` — добавлено поле `is_verified`
- `backend/app/schemas.py` — добавлено `is_verified` в UserOut
- `backend/app/core/config.py` — настройки SMTP
- `backend/app/services.py` — методы верификации
- `backend/app/api/endpoints/auth.py` — новые эндпоинты
- `requirements.txt` — `fastapi-mail>=1.4,<2`
- `.env` — переменные SMTP
- `README.md` — документация

### Созданы (5):
- `backend/app/core/email.py` — утилиты отправки
- `migrations/versions/0002_add_is_verified.py` — миграция БД
- `test_mail.py` — полный тест
- `test_mail_simple.py` — быстрый тест
- `instructions/EMAIL_SETUP.md` — инструкция

## Новые API эндпоинты

```
POST /auth/register — регистрация + отправка письма
POST /auth/verify-email?token={token} — подтверждение
POST /auth/resend-verification?email={email} — повтор
```

## Быстрый старт

### 1. Пересоберите контейнеры

```bash
docker compose down
docker compose up --build
```

### 2. Настройте SMTP в .env

**Gmail:**
```env
MAIL_USERNAME=youremail@gmail.com
MAIL_PASSWORD=<16-digit-app-password>
```

Создать App Password: https://myaccount.google.com/apppasswords  
(требуется 2FA)

**Mailtrap (для тестирования):**
```env
MAIL_SERVER=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=<mailtrap-username>
MAIL_PASSWORD=<mailtrap-password>
```

**Без SMTP (только dev):**
Оставьте `MAIL_USERNAME` и `MAIL_PASSWORD` пустыми.

### 3. Протестируйте

```bash
./.venv/bin/pip install requests
./.venv/bin/python test_mail.py
```

## Примеры использования

### cURL

**Регистрация:**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Иван","last_name":"Петров","username":"ivan","email":"ivan@example.com","password":"pass123"}'
```

**Подтверждение:**
```bash
curl -X POST "http://localhost:8000/auth/verify-email?token=YOUR_TOKEN"
```

**Повтор:**
```bash
curl -X POST "http://localhost:8000/auth/resend-verification?email=ivan@example.com"
```

### Python

```python
import requests

# Регистрация
r = requests.post('http://localhost:8000/auth/register', json={
    'first_name': 'Иван',
    'last_name': 'Петров',
    'username': 'ivan',
    'email': 'ivan@example.com',
    'password': 'pass123'
})
user = r.json()
print(user['is_verified'])  # False

# Подтверждение (токен из письма)
token = "..."
r = requests.post(f'http://localhost:8000/auth/verify-email?token={token}')
user = r.json()
print(user['is_verified'])  # True
```

## Проверка работы

### Логи

```bash
docker compose logs api | grep email
```

Должно быть:
```
[email] Verification email sent to ivan@example.com
```

Или при отсутствии SMTP:
```
[email] Skipping email to ivan@example.com: mail settings not configured
```

### Миграция

```bash
docker compose logs api | grep "Running upgrade"
```

Должно быть:
```
INFO  [alembic.runtime.migration] Running upgrade 0001 -> 0002, add is_verified field to users
```

## Устранение проблем

| Проблема | Решение |
|----------|---------|
| Письма не приходят | Проверьте `MAIL_USERNAME` и `MAIL_PASSWORD` в `.env` |
| Invalid credentials | Gmail: используйте App Password, не обычный пароль |
| Ошибка подключения | Gmail: порт 587 + `MAIL_STARTTLS=True` |
| Токен истёк | Используйте `/auth/resend-verification` |
| Email already verified | Это нормально — уже подтверждён |

## Настройки .env

```env
# SMTP-сервер
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=youremail@gmail.com
MAIL_PASSWORD=<app-password>
MAIL_FROM=youremail@gmail.com
MAIL_STARTTLS=True
MAIL_SSL_TLS=False

# Токены верификации
VERIFICATION_TOKEN_EXPIRE=1440  # 24 часа в минутах

# URL фронтенда для ссылок
FRONTEND_URL=http://localhost:3000
```

## Для продакшена

- [ ] Замените Gmail на SendGrid/AWS SES/Mailgun
- [ ] Настройте SPF/DKIM/DMARC для домена
- [ ] Добавьте rate limiting на `/auth/resend-verification`
- [ ] Замените `print()` на `logging`
- [ ] Обновите `FRONTEND_URL` на реальный домен
- [ ] Рассмотрите требование `is_verified=True` для входа

## Подробнее

См. `instructions/EMAIL_SETUP.md` для полной документации.
