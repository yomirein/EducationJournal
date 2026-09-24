# Настройка email-подтверждения регистрации

Платформа поддерживает подтверждение email-адресов пользователей при регистрации. Письма отправляются асинхронно через SMTP с HTML-шаблоном на русском языке.

## Краткая настройка

Добавьте в `.env`:

```env
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=youremail@gmail.com
MAIL_PASSWORD=<app-password>
MAIL_FROM=youremail@gmail.com
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
VERIFICATION_TOKEN_EXPIRE=1440
FRONTEND_URL=http://localhost:3000
```

При отсутствии `MAIL_USERNAME` или `MAIL_PASSWORD` письма не отправляются, но регистрация работает. В логах будет сообщение:

```
[email] Skipping email to user@example.com: mail settings not configured
```

## Настройка Gmail

Gmail требует включения двухфакторной аутентификации и использования App Password.

### Шаги настройки

1. **Включите 2FA** в вашем Google-аккаунте:
   - Перейдите на https://myaccount.google.com/security
   - Включите "2-Step Verification"

2. **Создайте App Password**:
   - Перейдите в раздел https://myaccount.google.com/apppasswords
   - Выберите "Mail" и "Other (Custom name)"
   - Введите название (например, "PixelStart")
   - Скопируйте сгенерированный 16-значный пароль

3. **Обновите `.env`**:
```env
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=youremail@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
MAIL_FROM=youremail@gmail.com
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

4. **Перезапустите API**:
```bash
docker compose restart api
```

## Использование других SMTP-серверов

### Yandex Mail

```env
MAIL_SERVER=smtp.yandex.ru
MAIL_PORT=465
MAIL_USERNAME=youremail@yandex.ru
MAIL_PASSWORD=<password>
MAIL_FROM=youremail@yandex.ru
MAIL_STARTTLS=False
MAIL_SSL_TLS=True
```

Для Яндекс Почты используйте обычный пароль или [пароль приложения](https://passport.yandex.ru/profile/access) если включена 2FA.

### Mail.ru

```env
MAIL_SERVER=smtp.mail.ru
MAIL_PORT=465
MAIL_USERNAME=youremail@mail.ru
MAIL_PASSWORD=<password>
MAIL_FROM=youremail@mail.ru
MAIL_STARTTLS=False
MAIL_SSL_TLS=True
```

### Mailtrap (тестовый SMTP для разработки)

[Mailtrap.io](https://mailtrap.io/) — бесплатный тестовый SMTP-сервер, который перехватывает письма без реальной отправки.

1. Зарегистрируйтесь на https://mailtrap.io
2. Создайте inbox и скопируйте SMTP credentials
3. Обновите `.env`:

```env
MAIL_SERVER=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=<mailtrap-username>
MAIL_PASSWORD=<mailtrap-password>
MAIL_FROM=noreply@example.com
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

### MailHog (локальный SMTP для разработки)

[MailHog](https://github.com/mailhog/MailHog) — локальный SMTP-сервер для перехвата писем.

```bash
# Запуск через Docker
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

```env
MAIL_SERVER=localhost
MAIL_PORT=1025
MAIL_USERNAME=test
MAIL_PASSWORD=test
MAIL_FROM=noreply@example.com
MAIL_STARTTLS=False
MAIL_SSL_TLS=False
```

Интерфейс: http://localhost:8025

## API-эндпоинты

### POST /auth/register

Регистрация пользователя с автоматической отправкой письма с подтверждением.

**Request:**
```json
{
  "first_name": "Иван",
  "last_name": "Петров",
  "username": "ivan",
  "email": "ivan@example.com",
  "password": "securepass123"
}
```

**Response (201):**
```json
{
  "id": 1,
  "first_name": "Иван",
  "last_name": "Петров",
  "username": "ivan",
  "email": "ivan@example.com",
  "is_verified": false,
  "role": "student",
  "description": null,
  "confirmed_docs": [],
  "payment": false
}
```

Письмо отправляется в фоне через `BackgroundTasks` и не блокирует HTTP-ответ.

### POST /auth/verify-email

Подтверждение email по токену из письма.

**Parameters:**
- `token` (query, required) — токен из письма

**Request:**
```bash
curl -X POST "http://localhost:8000/auth/verify-email?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200):**
```json
{
  "id": 1,
  "username": "ivan",
  "email": "ivan@example.com",
  "is_verified": true,
  ...
}
```

**Errors:**
- `400` — Invalid or expired verification token
- `400` — Email already verified
- `404` — User not found

### POST /auth/resend-verification

Повторная отправка письма с подтверждением (если не пришло или токен истёк).

**Parameters:**
- `email` (query, required) — email пользователя

**Request:**
```bash
curl -X POST "http://localhost:8000/auth/resend-verification?email=ivan@example.com"
```

**Response:** `204 No Content`

**Errors:**
- `400` — Email already verified
- `404` — User not found

## Содержимое письма

Письмо содержит HTML-шаблон на русском языке с кнопкой подтверждения и текстовой ссылкой на случай проблем с отображением.

Пример ссылки:
```
http://localhost:3000/verify-email?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Токен действителен 24 часа (настраивается через `VERIFICATION_TOKEN_EXPIRE` в минутах).

## Тестирование

### Автоматический тест

```bash
./.venv/bin/pip install requests
./.venv/bin/python test_mail.py
```

Скрипт `test_mail.py`:
- Регистрирует тестового пользователя
- Проверяет отправку письма
- Демонстрирует вход до подтверждения email
- Показывает инструкции по ручному подтверждению
- Тестирует повторную отправку письма
- Позволяет интерактивно ввести токен для подтверждения

Упрощённая версия: `test_mail_simple.py`.

### Ручное тестирование через cURL

**Регистрация:**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Тест",
    "last_name": "Пользователь",
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Подтверждение:**
```bash
curl -X POST "http://localhost:8000/auth/verify-email?token=YOUR_TOKEN"
```

**Повторная отправка:**
```bash
curl -X POST "http://localhost:8000/auth/resend-verification?email=test@example.com"
```

### Через Swagger UI

http://localhost:8000/docs — все эндпоинты доступны с интерактивной документацией.

## Проверка логов

При использовании Docker:

```bash
docker compose logs api | grep email
docker compose logs api | grep -i verification
```

При локальном запуске логи выводятся в консоль:

```
[email] Verification email sent to ivan@example.com
```

Или при отсутствии SMTP-настроек:

```
[email] Skipping email to ivan@example.com: mail settings not configured
```

## Устранение проблем

### Письма не приходят

1. **Проверьте логи:**
```bash
docker compose logs api | grep email
```

2. **Убедитесь, что SMTP-настройки заполнены:**
   - `MAIL_USERNAME` и `MAIL_PASSWORD` не пусты
   - `MAIL_SERVER` и `MAIL_PORT` корректны

3. **Для Gmail проверьте App Password:**
   - Используется 16-значный пароль из Google, а не обычный пароль аккаунта
   - 2FA включена на аккаунте

4. **Проверьте папку "Спам"** в почтовом ящике

### Ошибка "Invalid credentials" при отправке

**Gmail:**
- Убедитесь, что используется App Password, а не обычный пароль
- Проверьте, что 2FA включена: https://myaccount.google.com/security

**Другие сервисы:**
- Проверьте правильность username и password
- Убедитесь, что SMTP доступ разрешён в настройках почты

### Ошибка подключения к SMTP

**Неправильный порт или настройки TLS:**
- Gmail: порт 587 с `MAIL_STARTTLS=True`
- Yandex/Mail.ru: порт 465 с `MAIL_SSL_TLS=True`

**Проверка подключения:**
```bash
telnet smtp.gmail.com 587
# или
openssl s_client -connect smtp.gmail.com:587 -starttls smtp
```

### Токен истёк

Токен действителен 24 часа. Запросите новое письмо:

```bash
curl -X POST "http://localhost:8000/auth/resend-verification?email=user@example.com"
```

### Email уже подтверждён

При попытке повторного подтверждения или повторной отправки возвращается ошибка `400 Email already verified`. Это ожидаемое поведение.

## Архитектурные детали

### JWT-токены

- Тип токена: `email_verification`
- Срок действия: 24 часа (настраивается через `VERIFICATION_TOKEN_EXPIRE` в минутах)
- Подписываются тем же `SECRET_KEY`, что и access/refresh токены
- Содержат `user_id` в поле `sub`

### Асинхронная отправка

Письма отправляются через `BackgroundTasks` из FastAPI:
- Не блокируют HTTP-ответ регистрации
- Выполняются после возврата ответа клиенту
- При ошибке отправки регистрация уже завершена

### Graceful degradation

При отсутствии SMTP-настроек (`MAIL_USERNAME` или `MAIL_PASSWORD` пусты):
- Регистрация работает нормально
- Письма не отправляются
- В логах выводится предупреждение
- `is_verified` остаётся `false`

Это позволяет разрабатывать и тестировать без реального SMTP-сервера.

### Безопасность

- Токены имеют ограниченный срок действия (24 часа)
- Проверяется существование пользователя при верификации
- Защита от повторного подтверждения
- Email не отображается в публичных ошибках
- Токены невалидны после смены `SECRET_KEY`

## Интеграция с frontend

Frontend должен:
1. Обрабатывать `is_verified: false` при регистрации
2. Показывать сообщение о необходимости подтверждения email
3. Предоставлять кнопку "Отправить письмо повторно" → `/auth/resend-verification`
4. Иметь страницу `/verify-email` для обработки ссылок из писем

Пример обработки токена из URL:

```javascript
// /verify-email?token=...
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

if (token) {
  fetch(`/auth/verify-email?token=${token}`, { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      if (data.is_verified) {
        alert('Email успешно подтверждён!');
      }
    })
    .catch(err => alert('Ошибка подтверждения'));
}
```

## Рекомендации для продакшена

1. **Используйте профессиональный SMTP-сервис:**
   - [SendGrid](https://sendgrid.com/) — 100 писем/день бесплатно
   - [AWS SES](https://aws.amazon.com/ses/) — масштабируемо и дёшево
   - [Mailgun](https://www.mailgun.com/) — 5000 писем/месяц бесплатно

2. **Настройте DNS-записи:**
   - SPF, DKIM, DMARC для доменной почты
   - Повышает deliverability и снижает попадание в спам

3. **Добавьте rate limiting:**
   - Ограничьте `/auth/resend-verification` (например, 1 письмо в 2 минуты на email)

4. **Храните метрики отправки:**
   - Количество отправленных писем
   - Количество подтверждений
   - Ошибки отправки

5. **Замените `print()` на полноценное логирование:**
   - Используйте `logging` модуль Python
   - Пишите логи в файл или централизованную систему

6. **Настройте `FRONTEND_URL`:**
   - Укажите реальный домен вместо `http://localhost:3000`

7. **Рассмотрите требование `is_verified=True` для доступа:**
   - Сейчас вход работает и с неподтверждённым email
   - Можно добавить проверку в `AuthService.login()`
