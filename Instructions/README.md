# Инструкции по настройке PixelStart

Этот каталог содержит детальные инструкции по настройке дополнительных функций платформы.

## Доступные инструкции

### EMAIL_SETUP.md

Полная инструкция по настройке email-подтверждения регистрации пользователей:

- Настройка Gmail (с 2FA и App Password)
- Настройка Yandex Mail и Mail.ru
- Использование Mailtrap для тестирования
- Использование MailHog для локальной разработки
- API-эндпоинты для верификации
- Тестирование через тестовые скрипты
- Устранение проблем
- Архитектурные детали реализации
- Рекомендации для продакшена

## Краткая справка

### Email-подтверждение

Добавьте в `.env`:

```env
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=youremail@gmail.com
MAIL_PASSWORD=<app-password>
MAIL_FROM=youremail@gmail.com
MAIL_STARTTLS=True
```

Для Gmail создайте App Password: https://myaccount.google.com/apppasswords

Тестирование:

```bash
./.venv/bin/pip install requests
./.venv/bin/python test_mail.py
```

Подробнее: `EMAIL_SETUP.md`

## Разработчикам

При добавлении новых функций, требующих настройки, создавайте отдельные инструкции в этом каталоге и обновляйте этот README.md.

Формат названия: `FEATURE_SETUP.md` (например, `S3_SETUP.md`, `REDIS_SETUP.md`).
