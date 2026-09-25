(() => {
const API_BASE = window.PIXELSTART_API || (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http') ? window.location.origin : 'http://127.0.0.1:8000');

const auth = {
  get access() {
    return localStorage.getItem('pixelstart_access');
  },
  get refresh() {
    return localStorage.getItem('pixelstart_refresh');
  },
  save(tokens) {
    localStorage.setItem('pixelstart_access', tokens.access_token);
    localStorage.setItem('pixelstart_refresh', tokens.refresh_token);
  },
  clear() {
    localStorage.removeItem('pixelstart_access');
    localStorage.removeItem('pixelstart_refresh');
    localStorage.removeItem('pixelstart_user');
  }
};

// Backend error texts are English by convention; users see them in Russian.
const ERROR_TEXTS = {
  'A rejection reason is required': 'Укажите причину отклонения.',
  'Access denied': 'Нет доступа.',
  'Account curates existing streams; ask an admin to reassign them first': 'У аккаунта есть потоки. Попросите администратора передать их другому куратору.',
  'Allowed file types: PNG, JPG, WEBP, PDF, TXT': 'Можно загрузить только PNG, JPG, WEBP, PDF или TXT.',
  'Application already pending': 'Заявка уже отправлена и ждёт решения куратора.',
  'Application not found': 'Заявка не найдена.',
  'Course access denied': 'Нет доступа к этому курсу.',
  'Course access requires payment or enrollment': 'Курс доступен после зачисления в поток. Подайте заявку на странице курса.',
  'Course not found': 'Курс не найден.',
  'Decision must be accept or reject': 'Решение должно быть «принять» или «отклонить».',
  'Email already exists': 'Эта почта уже используется.',
  'Email already verified': 'Почта уже подтверждена.',
  'Email is not verified': 'Почта не подтверждена. Откройте ссылку из письма или запросите новое письмо.',
  'Invalid or expired reset token': 'Ссылка для смены пароля недействительна или уже использована. Запросите новую.',
  'File exceeds 20 MiB': 'Файл больше 20 МБ.',
  'Filename is required': 'У файла нет имени.',
  'Insufficient permissions': 'Недостаточно прав.',
  'Invalid credentials': 'Неверный логин или пароль.',
  'Invalid or expired access token': 'Сессия истекла. Войдите снова.',
  'Invalid or expired refresh token': 'Сессия истекла. Войдите снова.',
  'Invalid or expired verification token': 'Ссылка недействительна или устарела. Запросите письмо ещё раз.',
  'Lesson not found': 'Урок не найден.',
  'Module not found': 'Модуль не найден.',
  'Not authenticated': 'Войдите в аккаунт.',
  'Only Python tasks support sample runs': 'Проверка на примерах доступна только для задач на Python.',
  'Profile access denied': 'Нет доступа к профилю.',
  'Stream access denied': 'Нет доступа к этому потоку.',
  'Stream not found': 'Поток не найден.',
  'Submission not found': 'Решение не найдено.',
  'Task not found': 'Задание не найдено.',
  'Task not found in course': 'Задание не найдено в курсе.',
  'Too many requests, try again later': 'Слишком много попыток. Подождите минуту и попробуйте снова.',
  'Uploaded file not found': 'Загруженный файл не найден.',
  'User is a curator of existing streams; reassign or delete them first': 'Пользователь ведёт потоки. Сначала передайте их другому куратору или удалите.',
  'User not found': 'Пользователь не найден.',
  'Username or email already exists': 'Такой логин или почта уже заняты.',
  'curator_id must reference a curator': 'Выберите пользователя с ролью куратора.'
};

const FIELD_NAMES = {
  first_name: 'Имя', last_name: 'Фамилия', username: 'Логин', email: 'Почта', password: 'Пароль',
  login: 'Логин', title: 'Название', name: 'Название', text: 'Текст', description: 'Описание',
  start_date: 'Начало', end_date: 'Окончание', grade: 'Оценка', role: 'Роль'
};

// Pydantic validation issue -> short Russian sentence.
const validationText = issue => {
  const field = FIELD_NAMES[issue.loc?.[issue.loc.length - 1]] || 'Поле';
  switch (issue.type) {
    case 'missing': return `«${field}»: заполните поле.`;
    case 'string_too_short': return `«${field}»: минимум ${issue.ctx?.min_length} символов.`;
    case 'string_too_long': return `«${field}»: максимум ${issue.ctx?.max_length} символов.`;
    case 'value_error': return field === 'Почта' ? 'Некорректный адрес почты.' : `«${field}»: некорректное значение.`;
    case 'enum': return `«${field}»: недопустимое значение.`;
    default: return `«${field}»: некорректное значение.`;
  }
};

const errorMessage = (body, status) => {
  if (Array.isArray(body.detail)) return body.detail.map(validationText).join(' ');
  if (typeof body.detail === 'string') return ERROR_TEXTS[body.detail] || body.detail;
  return `Ошибка сервера (${status}). Попробуйте ещё раз.`;
};

async function request(path, options = {}, canRefresh = true) {
  const headers = new Headers(options.headers || {});
  
  if (!(options.body instanceof FormData) && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (auth.access) {
    headers.set('Authorization', `Bearer ${auth.access}`);
  }
  
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  
  if (response.status === 401 && canRefresh && auth.refresh) {
    const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: auth.refresh })
    });
    
    if (refreshResponse.ok) {
      auth.save(await refreshResponse.json());
      return request(path, options, false);
    }
    
    auth.clear();
  }
  
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(errorMessage(body, response.status));
    error.status = response.status;
    throw error;
  }
  
  return response.status === 204 ? null : response.json();
}

const api = {
  get: path => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: path => request(path, { method: 'DELETE' }),
  upload: (path, form) => request(path, { method: 'POST', body: form }),
  auth
};

window.pixelApi = api;
})();
