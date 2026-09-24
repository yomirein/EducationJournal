import requests

BASE = "http://localhost:8000"

# Credentials from .env
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "supersecret123"

USERS = [
    {"first_name": "Curator", "last_name": "Test", "username": "curator_test", "email": "curator@test.com", "password": "secret123"},
    {"first_name": "Student", "last_name": "Test", "username": "student_test", "email": "student@test.com", "password": "secret123"},
]


# --- helpers ---

def login(username, password):
    r = requests.post(f"{BASE}/auth/login", json={"login": username, "password": password})
    r.raise_for_status()
    return r.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def ok(label, r):
    status = "OK" if r.ok else "FAIL"
    print(f"[{status}] {label} — {r.status_code}")
    if not r.ok:
        print("      ", r.text[:300])
    return r


# --- tests ---

def test_health():
    print("\n=== Health ===")
    ok("health", requests.get(f"{BASE}/health"))


def test_register():
    print("\n=== Register ===")
    for u in USERS:
        ok(f"register {u['username']}", requests.post(f"{BASE}/auth/register", json=u))

    # duplicate
    ok("register duplicate (expect 409)", requests.post(f"{BASE}/auth/register", json=USERS[0]))


def test_login():
    print("\n=== Login ===")
    ok("login admin",   requests.post(f"{BASE}/auth/login", json={"login": ADMIN_USERNAME,  "password": ADMIN_PASSWORD}))
    ok("login curator", requests.post(f"{BASE}/auth/login", json={"login": "curator_test",  "password": "secret123"}))
    ok("login student", requests.post(f"{BASE}/auth/login", json={"login": "student_test",  "password": "secret123"}))
    ok("login wrong pass (expect 401)", requests.post(f"{BASE}/auth/login", json={"login": ADMIN_USERNAME, "password": "wrong"}))


def test_me():
    print("\n=== /users/me ===")
    for role, username, password in [
        ("admin",   ADMIN_USERNAME,  ADMIN_PASSWORD),
        ("curator", "curator_test",  "secret123"),
        ("student", "student_test",  "secret123"),
    ]:
        try:
            token = login(username, password)
            r = ok(f"me as {role}", requests.get(f"{BASE}/users/me", headers=auth(token)))
            if r.ok:
                print("       role:", r.json().get("role"))
        except Exception as e:
            print(f"[SKIP] me as {role} — {e}")

    ok("me unauthenticated (expect 401)", requests.get(f"{BASE}/users/me"))


def test_admin_panel():
    print("\n=== Admin panel ===")
    try:
        admin_token = login(ADMIN_USERNAME, ADMIN_PASSWORD)
    except Exception as e:
        print(f"[SKIP] admin login failed — {e}")
        return

    ok("list users (admin)", requests.get(f"{BASE}/panel/users", headers=auth(admin_token)))
    ok("list users role=student", requests.get(f"{BASE}/panel/users?role=student", headers=auth(admin_token)))

    # promote curator_test to curator
    users_r = requests.get(f"{BASE}/panel/users", headers=auth(admin_token))
    if users_r.ok:
        curator_id = next((u["id"] for u in users_r.json() if u["username"] == "curator_test"), None)
        if curator_id:
            ok("promote curator_test to curator",
               requests.patch(f"{BASE}/panel/users/{curator_id}", json={"role": "curator"}, headers=auth(admin_token)))

    # student should not access panel
    try:
        student_token = login("student_test", "secret123")
        ok("panel as student (expect 403)", requests.get(f"{BASE}/panel/users", headers=auth(student_token)))
    except Exception:
        pass


def test_courses():
    print("\n=== Courses ===")
    ok("list courses (public)", requests.get(f"{BASE}/courses"))
    ok("get course 1", requests.get(f"{BASE}/courses/1"))
    ok("get nonexistent course (expect 404)", requests.get(f"{BASE}/courses/99999"))

    try:
        student_token = login("student_test", "secret123")
        ok("course tasks (no access, expect 403)",
           requests.get(f"{BASE}/courses/1/tasks", headers=auth(student_token)))
    except Exception as e:
        print(f"[SKIP] courses student — {e}")


def test_streams():
    print("\n=== Streams ===")
    ok("list streams (public)", requests.get(f"{BASE}/streams"))

    try:
        student_token = login("student_test", "secret123")
        ok("join stream 1", requests.post(f"{BASE}/streams/1/join", headers=auth(student_token)))
    except Exception as e:
        print(f"[SKIP] stream join — {e}")


def test_curator_stats():
    print("\n=== Curator stats ===")
    try:
        curator_token = login("curator_test", "secret123")
    except Exception as e:
        print(f"[SKIP] curator login — {e}")
        return

    ok("stats course 1 (curator)",  requests.get(f"{BASE}/panel/stats/courses/1",  headers=auth(curator_token)))
    ok("stats stream 1 (curator)",  requests.get(f"{BASE}/panel/stats/streams/1",  headers=auth(curator_token)))


def test_update_me():
    print("\n=== Update /users/me ===")
    try:
        student_token = login("student_test", "secret123")
        ok("update description",
           requests.patch(f"{BASE}/users/me", json={"description": "test bio"}, headers=auth(student_token)))
    except Exception as e:
        print(f"[SKIP] update me — {e}")


if __name__ == "__main__":
    test_health()
    test_register()
    test_login()
    test_me()
    test_admin_panel()
    test_courses()
    test_streams()
    test_curator_stats()
    test_update_me()
