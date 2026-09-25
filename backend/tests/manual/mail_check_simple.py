"""
Простой скрипт для тестирования email-подтверждения
Использование: python -m backend.tests.manual.mail_check_simple
"""
import os
import requests
import sys

API_BASE = os.getenv("API_BASE", "http://127.0.0.1:8000")

def main():
    print("=" * 60)
    print("  ТЕСТ РЕГИСТРАЦИИ С EMAIL-ПОДТВЕРЖДЕНИЕМ")
    print("=" * 60)

    # Создаём уникального пользователя
    import time
    timestamp = int(time.time())

    test_user = {
        "first_name": "Иван",
        "last_name": "Тестов",
        "username": f"testuser{timestamp}",
        "email": f"test{timestamp}@example.com",
        "password": "SecurePass123!"
    }

    print(f"\n📝 Регистрируем пользователя:")
    print(f"   Username: {test_user['username']}")
    print(f"   Email: {test_user['email']}")

    # Регистрация
    try:
        response = requests.post(f"{API_BASE}/auth/register", json=test_user)
    except Exception as e:
        print(f"\n❌ Ошибка подключения к API: {e}")
        print("   Запустите сервер: docker compose up")
        sys.exit(1)

    if response.status_code == 201:
        user = response.json()
        print(f"\n✅ Регистрация успешна!")
        print(f"   ID: {user['id']}")
        print(f"   is_verified: {user['is_verified']}")

        if not user['is_verified']:
            print(f"\n📧 Письмо отправлено на: {test_user['email']}")
            print("\n" + "-" * 60)
            print("ИНСТРУКЦИЯ:")
            print("-" * 60)
            print("1. Проверьте почту или Mailtrap inbox")
            print("2. Скопируйте токен из письма (часть после ?token=)")
            print("3. Выполните подтверждение:")
            print(f'\n   curl -X POST "http://localhost:8000/auth/verify-email?token=YOUR_TOKEN"')
            print("\n   ИЛИ откройте http://localhost:8000/docs")
            print("   и используйте endpoint POST /auth/verify-email")
            print("\n4. Если письмо не пришло, запросите повторно:")
            print(f'\n   curl -X POST "http://localhost:8000/auth/resend-verification?email={test_user["email"]}"')
            print("-" * 60)

            # Проверка логов
            print("\n💡 Для проверки отправки писем:")
            print("   docker compose logs api | grep email")
        else:
            print("\n⚠️  ВНИМАНИЕ: is_verified уже true после регистрации!")
            print("   Проверьте конфигурацию email-верификации")
    else:
        print(f"\n❌ Ошибка регистрации: {response.status_code}")
        print(f"   {response.json()}")
        sys.exit(1)

    # Проверка входа
    print("\n" + "=" * 60)
    print("  ПРОВЕРКА ВХОДА ДО ПОДТВЕРЖДЕНИЯ EMAIL")
    print("=" * 60)

    response = requests.post(
        f"{API_BASE}/auth/login",
        json={"login": test_user['username'], "password": test_user['password']}
    )

    if response.status_code == 200:
        tokens = response.json()
        print("\n✅ Вход выполнен успешно")
        print("   (is_verified НЕ требуется для входа в систему)")

        # Проверка профиля
        access_token = tokens['access_token']
        response = requests.get(
            f"{API_BASE}/users/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if response.status_code == 200:
            me = response.json()
            print(f"\n   Профиль пользователя:")
            print(f"   • Имя: {me['first_name']} {me['last_name']}")
            print(f"   • Email: {me['email']}")
            print(f"   • Verified: {me['is_verified']}")
            print(f"   • Роль: {me['role']}")
    else:
        print(f"\n❌ Вход заблокирован: {response.status_code}")
        print("   (если это ожидается — всё работает корректно)")

    print("\n" + "=" * 60)
    print("✅ Тест завершён")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Прервано пользователем")
        sys.exit(1)
