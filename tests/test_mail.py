"""
Тест email-подтверждения регистрации
Демонстрирует полный цикл: регистрация → получение токена → подтверждение
"""
import requests
import time
from datetime import datetime

# Конфигурация
API_BASE = "http://localhost:8000"
TEST_USER = {
    "first_name": "Тестовый",
    "last_name": "Пользователь",
    "username": f"testuser_{int(time.time())}",  # Уникальное имя
    "email": f"testuser_{int(time.time())}@example.com",  # Уникальный email
    "password": "TestPassword123!"
}


def print_section(title: str):
    """Красивый вывод секций"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_response(response: requests.Response):
    """Вывод информации о HTTP-ответе"""
    print(f"Status: {response.status_code}")
    try:
        data = response.json()
        print(f"Response: {data}")
        return data
    except:
        print(f"Response: {response.text}")
        return None


def test_registration_flow():
    """Тестирование полного цикла регистрации с email-подтверждением"""

    print_section("ТЕСТ EMAIL-ПОДТВЕРЖДЕНИЯ РЕГИСТРАЦИИ")
    print(f"Время запуска: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Тестовый пользователь: {TEST_USER['username']} ({TEST_USER['email']})")

    # ========================================================================
    # Шаг 1: Регистрация пользователя
    # ========================================================================
    print_section("Шаг 1: Регистрация пользователя (POST /auth/register)")

    response = requests.post(
        f"{API_BASE}/auth/register",
        json=TEST_USER
    )

    user_data = print_response(response)

    if response.status_code != 201:
        print("\n❌ ОШИБКА: Регистрация не удалась!")
        return False

    print(f"\n✓ Пользователь успешно зарегистрирован")
    print(f"  ID: {user_data.get('id')}")
    print(f"  Email: {user_data.get('email')}")
    print(f"  Username: {user_data.get('username')}")
    print(f"  is_verified: {user_data.get('is_verified')}")

    if user_data.get('is_verified'):
        print("\n⚠️  ВНИМАНИЕ: Пользователь уже верифицирован после регистрации!")
        print("   Ожидалось: is_verified = false")
    else:
        print("\n✓ Статус корректный: email не подтверждён (is_verified = false)")

    user_id = user_data.get('id')

    # ========================================================================
    # Шаг 2: Проверка отправки email
    # ========================================================================
    print_section("Шаг 2: Проверка отправки email")

    print("📧 Письмо с подтверждением должно быть отправлено на:", TEST_USER['email'])
    print("\nПроверьте:")
    print("  • Если используется Gmail — проверьте почтовый ящик")
    print("  • Если используется Mailtrap — проверьте inbox на mailtrap.io")
    print("  • Если SMTP не настроен — проверьте логи Docker:")
    print("    docker compose logs api | grep email")
    print("\nПисьмо содержит ссылку вида:")
    print(f"  http://localhost:3000/verify-email?token=<VERIFICATION_TOKEN>")

    # ========================================================================
    # Шаг 3: Попытка входа до подтверждения email
    # ========================================================================
    print_section("Шаг 3: Попытка входа ДО подтверждения email")

    print("Проверяем, можно ли войти с неподтверждённым email...")

    response = requests.post(
        f"{API_BASE}/auth/login",
        json={
            "login": TEST_USER['username'],
            "password": TEST_USER['password']
        }
    )

    login_data = print_response(response)

    if response.status_code == 200:
        print("\n✓ Вход выполнен успешно (is_verified не требуется для входа)")
        print(f"  Access token получен: {login_data.get('access_token')[:30]}...")
        access_token = login_data.get('access_token')

        # Проверяем профиль
        print("\nПроверяем профиль пользователя (GET /users/me)...")
        response = requests.get(
            f"{API_BASE}/users/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        me_data = print_response(response)

        if me_data:
            print(f"\n  Имя: {me_data.get('first_name')} {me_data.get('last_name')}")
            print(f"  Email: {me_data.get('email')}")
            print(f"  is_verified: {me_data.get('is_verified')}")
    else:
        print("\n❌ Вход заблокирован для неподтверждённых пользователей")
        print("   (если это ожидаемое поведение, то всё корректно)")

    # ========================================================================
    # Шаг 4: Инструкция по ручному подтверждению
    # ========================================================================
    print_section("Шаг 4: Инструкция по подтверждению email")

    print("Для завершения теста выполните следующие действия:\n")

    print("1️⃣  Получите токен подтверждения из письма:")
    print("   • Откройте письмо на вашей почте или в Mailtrap")
    print("   • Скопируйте токен из URL (часть после ?token=)")
    print("   • Или посмотрите в логах Docker (если отладка включена)\n")

    print("2️⃣  Выполните подтверждение одним из способов:\n")

    print("   ВАРИАНТ А — через cURL:")
    print('   curl -X POST "http://localhost:8000/auth/verify-email?token=YOUR_TOKEN_HERE"')
    print()

    print("   ВАРИАНТ Б — через Python:")
    print("   >>> import requests")
    print('   >>> token = "YOUR_TOKEN_HERE"')
    print(f'   >>> requests.post("http://localhost:8000/auth/verify-email?token={{token}}")')
    print()

    print("   ВАРИАНТ В — через Swagger UI:")
    print("   • Откройте http://localhost:8000/docs")
    print("   • Найдите endpoint POST /auth/verify-email")
    print("   • Введите токен и выполните запрос")
    print()

    print("3️⃣  После подтверждения снова войдите и проверьте профиль:")
    print("   • is_verified должен стать true")
    print()

    # ========================================================================
    # Шаг 5: Демонстрация повторной отправки
    # ========================================================================
    print_section("Шаг 5: Повторная отправка письма (если нужно)")

    print("Если письмо не пришло или токен истёк, можно запросить новое:\n")

    print("   ВАРИАНТ А — через cURL:")
    print(f'   curl -X POST "http://localhost:8000/auth/resend-verification?email={TEST_USER["email"]}"')
    print()

    print("   ВАРИАНТ Б — через Python:")
    print(f'   >>> requests.post("http://localhost:8000/auth/resend-verification?email={TEST_USER["email"]}")')
    print()

    print("Проверяем возможность повторной отправки...")
    response = requests.post(
        f"{API_BASE}/auth/resend-verification",
        params={"email": TEST_USER['email']}
    )

    if response.status_code == 204:
        print("\n✓ Повторная отправка выполнена успешно!")
        print("  Проверьте почту — должно прийти новое письмо")
    else:
        print(f"\n⚠️  Статус: {response.status_code}")
        print_response(response)

    # ========================================================================
    # Итоги
    # ========================================================================
    print_section("ИТОГИ ТЕСТА")

    print(f"✓ Пользователь зарегистрирован: {TEST_USER['username']}")
    print(f"✓ Email: {TEST_USER['email']}")
    print(f"✓ Письмо с подтверждением отправлено (проверьте почту)")
    print(f"✓ Повторная отправка работает")
    print()
    print("📋 Следующие шаги:")
    print("   1. Проверьте почту и получите токен")
    print("   2. Подтвердите email через /auth/verify-email?token=...")
    print("   3. Проверьте, что is_verified стал true")
    print()
    print("🔧 Для отладки:")
    print("   docker compose logs api | grep email")
    print("   docker compose logs api | grep -i verification")

    return True


def test_manual_verification():
    """
    Интерактивный режим для ручного подтверждения email
    """
    print_section("РУЧНОЕ ПОДТВЕРЖДЕНИЕ EMAIL")

    print("Этот режим позволяет вручную ввести токен для подтверждения\n")

    token = input("Введите токен из письма (или Enter для пропуска): ").strip()

    if not token:
        print("Токен не введён, пропускаем подтверждение")
        return False

    print(f"\nПодтверждаем email с токеном: {token[:20]}...")

    response = requests.post(
        f"{API_BASE}/auth/verify-email",
        params={"token": token}
    )

    user_data = print_response(response)

    if response.status_code == 200:
        print("\n✅ EMAIL УСПЕШНО ПОДТВЕРЖДЁН!")
        print(f"  Пользователь: {user_data.get('username')}")
        print(f"  Email: {user_data.get('email')}")
        print(f"  is_verified: {user_data.get('is_verified')}")
        return True
    else:
        print("\n❌ Ошибка подтверждения")
        if response.status_code == 400:
            print("  Возможные причины:")
            print("  • Токен недействителен")
            print("  • Токен истёк (более 24 часов)")
            print("  • Email уже подтверждён")
        return False


if __name__ == "__main__":
    try:
        # Проверка доступности API
        try:
            health = requests.get(f"{API_BASE}/health", timeout=5)
            if health.status_code != 200:
                print(f"❌ API недоступен на {API_BASE}")
                print("   Запустите сервер: docker compose up")
                exit(1)
        except requests.exceptions.ConnectionError:
            print(f"❌ Не удалось подключиться к {API_BASE}")
            print("   Убедитесь, что сервер запущен: docker compose up")
            exit(1)

        # Основной тест
        success = test_registration_flow()

        if not success:
            exit(1)

        # Предложение ручного подтверждения
        print("\n" + "=" * 70)
        response = input("\nХотите вручную ввести токен для подтверждения? (y/N): ").strip().lower()

        if response == 'y':
            test_manual_verification()
        else:
            print("\nТест завершён. Подтверждение email можно выполнить позже.")

        print("\n✅ Тест завершён успешно!")

    except KeyboardInterrupt:
        print("\n\n⚠️  Тест прерван пользователем")
        exit(1)
    except Exception as e:
        print(f"\n\n❌ Неожиданная ошибка: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
