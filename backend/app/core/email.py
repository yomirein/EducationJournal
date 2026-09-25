from urllib.parse import quote
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from backend.app.core.config import settings


def get_email_config():
    if not settings.mail_username or not settings.mail_password:
        return None
    return ConnectionConfig(
        MAIL_USERNAME=settings.mail_username,
        MAIL_PASSWORD=settings.mail_password,
        MAIL_FROM=settings.mail_from or settings.mail_username,
        MAIL_PORT=settings.mail_port,
        MAIL_SERVER=settings.mail_server,
        MAIL_STARTTLS=settings.mail_starttls,
        MAIL_SSL_TLS=settings.mail_ssl_tls,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )


async def send_verification_email(email: str, token: str):
    config = get_email_config()
    if not config:
        print(f"[email] Skipping email to {email}: mail settings not configured")
        return

    verification_url = f"{settings.frontend_url.rstrip('/')}/auth/verify.html?token={quote(token)}"
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4CAF50;">Подтверждение email</h2>
                <p>Здравствуйте!</p>
                <p>Для завершения регистрации на платформе онлайн-обучения, пожалуйста, подтвердите ваш email-адрес, нажав на кнопку ниже:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}"
                       style="background-color: #4CAF50; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Подтвердить email
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:<br>
                    <a href="{verification_url}" style="color: #4CAF50;">{verification_url}</a>
                </p>
                <p style="color: #666; font-size: 14px;">
                    Ссылка действительна в течение 24 часов.
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    Если вы не регистрировались на нашей платформе, проигнорируйте это письмо.
                </p>
            </div>
        </body>
    </html>
    """

    message = MessageSchema(
        subject="Подтверждение email - Learning Platform",
        recipients=[email],
        body=html_body,
        subtype=MessageType.html,
    )

    fm = FastMail(config)
    await fm.send_message(message)
    print(f"[email] Verification email sent to {email}")
