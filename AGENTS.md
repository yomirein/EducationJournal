# AGENTS.md

Guidance for coding agents working in this repository. User-facing docs are in `README.md` (Russian); this file covers what an agent needs to change code safely.

## Project

PixelStart — a learning platform for school programming courses (Scratch, Minecraft Education, Python). Roles: `student`, `curator`, `admin`. One FastAPI process serves both the JSON API and the static frontend from `front/`. Database: PostgreSQL only.

UI text, user-facing error messages in the frontend, docs and commit discussion are in Russian. API error `detail` strings in the backend are in English. Code identifiers and comments are in English.

## Layout

- `backend/app/main.py` — FastAPI app: includes routers, mounts `/uploads` and `front/` (catch-all, mounted last).
- `backend/app/api/endpoints/` — routers: `auth`, `users`, `courses`, `streams`, `panel` (admin-only, plus `stats_router` for admin+curator), `files`, `schedule`.
- `backend/app/api/deps.py` — `get_current_user`, `require_role(*roles)`.
- `backend/app/core/` — `config.py` (pydantic-settings, reads `.env` from CWD), `security.py` (JWT, argon2), `email.py`, `rate_limit.py`.
- `backend/app/models.py` / `schemas.py` — SQLAlchemy models / Pydantic v2 schemas.
- `backend/app/core/email.py` — outgoing mail via SMTP (`fastapi-mail`): `send_email()` never raises (logs to `pixelstart.email`), `send_verification_email()`. Local dev uses Mailpit from docker-compose (UI http://127.0.0.1:8025), prod uses Yandex SMTP (`smtp.yandex.ru:465`, SSL, app password, `MAIL_FROM` = login). Check settings with `python -m backend.scripts.send_test_email you@example.com`.
- `backend/app/progress.py` — the only place for pass rules, points, ranks and curator early warnings (`stream_progress`). Endpoints `/users/me/rating`, `/streams/{id}/progress` and panel stats use it; do not re-implement "is passed" elsewhere.
- `backend/app/evaluator.py` — auto-grading; runs student Python in a subprocess with rlimits and an AST allow-list.
- `backend/migrations/` — Alembic; `backend/alembic.ini` resolves paths relative to itself.
- `backend/scripts/seed.py` — **destructive** demo seed; requires `PIXELSTART_ALLOW_DEMO_SEED=1`.
- `backend/tests/test_curriculum.py` — unit tests (no server). `backend/tests/manual/` — scripts against a running server (not collected by unittest: the folder has no `__init__.py` and file names don't start with `test`).
- `front/assets/api.js` — the only HTTP client (`window.pixelApi`: `get/post/put/patch/delete/upload`, token storage, one refresh retry on 401).
- `front/assets/css/` — plain stylesheets, no build step or local `@import` chain. Every page explicitly loads `core/base.css` (reset and theme tokens), `shared/ui.css` (buttons, forms, cards, tables), and `shared/layout.css` (navigation, header, demo controls), then the shared components and page styles it renders. `shared/` also contains courses, participants, task content, notifications and profiles; `student/`, `curator/`, `admin/`, `public/` contain page styles. Keep a component's responsive rules and dark overrides in its own file, in cascade order. Shared classes such as `.auth-form` belong in `shared/ui.css`, even when their name mentions a page. Check light/dark and mobile layouts when changing stylesheet order.
- `front/assets/js/` — page logic, split into plain classic scripts (no build step, no modules): they share one global scope, so load order matters. Each page lists the scripts it needs in its `<script defer>` tags: a fixed base set (`core/*` and `shared/*`, same on every page), then the page-specific files, then `shared/theme-sync.js` last.
  - `core/` — `ui` (toast, `run`, `bind`, `api`), `util` (`plural`, `escapeHtml`, `safeHref`), `session` (`getCurrentUser`, `getCourses`), `course-helpers`, `page-data` (`registerLoader`, `refreshPageData`), `access` (logout, role guard), `user` (sidebar user).
  - `shared/` — theme, quick login, demo switcher, ticker, notifications, profile, and the curator/admin helpers `api-output`, `stream-pickers`, `option-selects`.
  - `forms/` — `data-form` handlers: `auth`, `account`, `admin`, `curator`.
  - `student/`, `curator/`, `admin/` — one file per page or feature; `landing.js` for `index.html`.
  - A new page feature is a new file: it registers its own `DOMContentLoaded` handler, and you add it to that page's script tags. Each `init*` returns early when its DOM markers (`data-form`, ids) are missing.
- `front/simulators/` — standalone Scratch and Kumir-Craft apps embedded via iframe, talk to the task page with `postMessage`.
- `docs/` — curriculum source text, email setup docs, roadmap.

## Commands

Run everything from the repository root: `.env` is read from the CWD, and modules import `backend.app...`. Use `python -m` for scripts, not file paths.

```bash
docker compose up -d db                                     # PostgreSQL on localhost:5432
pip install -r backend/requirements.txt
cp .env.example .env                                        # set SECRET_KEY
alembic -c backend/alembic.ini upgrade head
PIXELSTART_ALLOW_DEMO_SEED=1 python -m backend.scripts.seed # empty/demo DB only
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000

python -m unittest discover -s backend/tests -t .           # unit tests
python -m compileall -q backend
find front/assets -name '*.js' -exec node --check {} \;
PIXELSTART_ALLOW_API_SMOKE=1 python -m backend.tests.manual.api_smoke  # needs running server + requests
```

Demo accounts after seeding: `student/student12345`, `curator/curator12345`, `admin/admin12345`.

There is no linter or formatter config. Match the surrounding style: 4-space Python, type hints on new code, double quotes in Python; 2-space JS, single quotes, template literals, no framework, no build step.

## Conventions

- **Request bodies are Pydantic schemas** in `schemas.py` — never `data: dict`. Partial updates use `model_dump(exclude_unset=True)`.
- **Endpoints that return ORM `User` objects must set `response_model=UserOut`**, otherwise `password_hash` leaks.
- Errors: `raise HTTPException(status, "English message")`. Integrity violations on commit → rollback + 409. Every new `detail` text needs a Russian translation in `ERROR_TEXTS` in `front/assets/api.js` (validation errors are translated there by type); errors carry `error.status` for the UI.
- Some endpoints return hand-built dicts (e.g. submissions, schedule, leaderboard). When adding fields, keep existing keys: the scripts in `front/assets/js/` read them directly.
- DB access: async SQLAlchemy 2 (`select(...)`, `await db.scalar/scalars/execute`). Sessions come from `Depends(get_session)`.
- Datetimes are timezone-aware (`datetime.now(timezone.utc)`).
- Schema changes need an Alembic revision in `backend/migrations/versions/` (`alembic -c backend/alembic.ini revision --autogenerate -m "..."`). Migrations use PostgreSQL syntax; SQLite is not supported.

## Security invariants (do not regress)

- Changing the password or the email via `PATCH /users/me` requires `current_password`. A new email is stored in `pending_email` and replaces `email` only after `POST /auth/confirm-email-change` with the token mailed to the new address.
- Login requires `is_verified`. Password reset tokens carry a fingerprint of the password hash (`password_fingerprint`), so a link stops working after use; `/auth/forgot-password` always answers 204.

- `require_role(...)` for role gates; stream endpoints use `staff = require_role(curator, admin)` plus `owned(stream_id, user, db)` (admin sees all, curator only own streams).
- Grading and file removal must go through `stream_submission(stream, task_id, submission_id, db)`: it checks that the submission belongs to the task, the stream's course and a participant of that stream (IDOR guard).
- `curator-alerts` and similar curator views must be scoped to the curator's own streams.
- Students must never receive answer keys: `sanitize_task_meta` strips `correct_answers`, `number_answer`, `hidden_tests`, `reference_solution`, `criteria`, `hint`. Covered by `test_student_payload_has_no_answer_keys`.
- Course content access for students: `has_course_access` (paid flag or accepted stream participant).
- `file_id` must match an uploaded file key (`<32 hex>.<ext>`) that exists in `settings.upload_dir`.
- Auth endpoints are rate limited (`core/rate_limit.py`, in-memory, per path and IP).
- Frontend: any API data rendered through `innerHTML` must go through `escapeHtml()` (escapes quotes too); URLs in `href` through `safeHref()`; numeric ids through `Number()`. Student-submitted text is shown to curators — treat it as hostile.

## Frontend gotchas

- **Data freshness:** every block that shows API data registers its loader with `registerLoader(loader)`; every successful change calls `await refreshPageData()`, which re-runs all registered loaders. New lists and forms must follow this, never patch the DOM by hand after a mutation.
- Use the shared helpers in `front/assets/js/core/` instead of re-implementing them: `getCurrentUser()` / `getCourses()` (one request per page), `resolveCourseId()`, `stepIcon/stepLabel`, `courseType`, `courseCard`, `criteriaBox`, `quickLogin`, `homeForRole`. Inside the task studio, submit answers with `submitAnswer(task, input, { workbench })`.
- Students enrol via the course page: `[data-course-enroll]` lists the course's streams with the status from `GET /users/me/applications` and posts `POST /streams/{id}/join`. Course pages load steps through `loadCourseTasks()`, which shows an enrol hint on 403 instead of an endless loading state.
- Notifications: `initNotifications()` renders the bell dropdown (last 3, link to all), `initNotificationsPage()` the full list on `student/notifications.html`; read ids are kept in `localStorage` (`pixelstart_read_broadcasts`).
- Admin forms pick entities from API-filled selects (`select[data-options]`: courses, curators, users, modules via `GET /panel/modules`, lessons via `GET /panel/lessons`), never raw ids.
- Buttons: one component `.button` (`front/assets/css/shared/ui.css`). Variants only change tokens `--btn-*`: `button-dark`/`button-lime` = primary (filled blue), `button-soft` = secondary (outline), `button-danger` = destructive (red outline); size `button-sm` (36px). Filters, tabs and switchers use `chip-toggle` (+ `.active`). Do not add new `*-btn` classes; extend these. Never hardcode light colours in JS or HTML: use theme tokens, the dark theme overrides them.
- Status badges use the design system classes `status status-done|review|failed|progress`; plural forms go through `plural(n, one, few, many)`.
- Curator pages pick streams from `select[data-stream-select]` (filled from `/users/me/streams`); `data-stream-reload="X"` reloads the `[data-load-target="X"]` block on change. Do not hardcode stream ids.
- Demo quick-login buttons use `data-quick-login="<role>"` inside a `data-demo-only` container; no inline scripts in HTML.
- `assets/theme-init.js` is a blocking script in every page `<head>` (before `api.js`): it sets `data-theme` from `localStorage` before first paint. Keep it first and non-deferred, or the dark theme flashes light.
- HTML pages load assets with a cache-busting query (`assets/js/core/ui.js?v=YYYYMMDDNN`). After changing any file in `front/assets/`, run `python scripts/bump_assets.py` (sets one fresh `v=` in **all** HTML files), or browsers keep the old file.
- Pages under `/student/`, `/curator/`, `/admin/` are guarded client-side by `verifyPageAccess()` (admin may open all of them). The real authorization is on the backend.
- `front/assets/css/core/base.css` defines theme tokens on `:root` and dark overrides under `[data-theme="dark"]`; `--text`, `--border`, `--accent`, `--danger` are aliases used by inline styles.
- Quick demo login buttons are shown only on `localhost`/`127.0.0.1`.

## Open questions (don't implement without the owner)

- Payment flow beyond the admin `payment` flag; Markdown in broadcasts.
- "Read" state of notifications lives in the browser (`localStorage`), not on the server.
