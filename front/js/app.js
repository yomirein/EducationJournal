import { api, API_URL } from './api.js';

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');

const state = {
  user: null,
  courses: [],
  streams: [],
  route: location.hash.slice(1) || 'home',
};

const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[char]));

function notify(message, error = false) {
  toast.textContent = message;
  toast.className = `toast visible${error ? ' error' : ''}`;
  
  clearTimeout(window.pixelToastTimer);
  window.pixelToastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 2600);
}

function button(label, action, className = 'button dark', attrs = '') {
  return `<button class="${className}" data-action="${action}" ${attrs}>${label}</button>`;
}

function card(content) {
  return `<section class="card">${content}</section>`;
}

function pageHead(kicker, title, lede = '') {
  const ledeHtml = lede ? `<p class="page-lede">${lede}</p>` : '';
  return `<div class="page-head">
    <div>
      <p class="eyebrow">${kicker}</p>
      <h1>${title}</h1>
    </div>
    ${ledeHtml}
  </div>`;
}

function navLink(route, label, icon) {
  const isActive = state.route === route ? 'active' : '';
  return `<a class="side-link ${isActive}" href="#${route}">
    <span class="side-icon">${icon}</span>
    ${label}
  </a>`;
}

function shell(content, title) {
  let roleLinks = '';
  
  if (state.user?.role === 'admin') {
    roleLinks = `<p class="nav-label nav-gap">Служебное</p>
      <nav>${navLink('admin', 'Админ-панель', '▥')}</nav>`;
  } else if (state.user?.role === 'curator') {
    roleLinks = `<p class="nav-label nav-gap">Служебное</p>
      <nav>${navLink('curator', 'Панель куратора', '✓')}</nav>`;
  }

  return `<div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="#journal">
        <span class="brand-mark"><i></i><i></i><i></i><i></i></span>
        <span>pixel<span>start</span><b>platform</b></span>
      </a>
      <p class="nav-label">Обучение</p>
      <nav>
        ${navLink('journal', 'Журнал', '⌂')}
        ${navLink('courses', 'Мои курсы', '▦')}
        ${navLink('catalog', 'Каталог', '+')}
      </nav>
      <p class="nav-label nav-gap">Аккаунт</p>
      <nav>
        ${navLink('profile', 'Профиль', '●')}
        ${navLink('settings', 'Настройки', '⚙')}
      </nav>
      ${roleLinks}
      <div class="sidebar-bottom">
        <strong>${esc(state.user?.first_name || '')} ${esc(state.user?.last_name || '')}</strong>
        <small>${esc(state.user?.email || '')}</small>
        <span class="role">${esc(state.user?.role || '')}</span>
        <button class="logout" data-action="logout">Выйти</button>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <span class="crumb">${title}</span>
        <div class="top-actions">
          <span class="api-state">API ${API_URL.replace(/^https?:\/\//, '')}</span>
          <button class="icon-button" data-action="health" title="Проверить API">●</button>
          <span class="user-dot">${esc((state.user?.first_name || 'Г').slice(0, 1))}</span>
        </div>
      </header>
      <div class="content">${content}</div>
    </main>
  </div>`;
}

function authLayout(kicker, title, description, form) {
  return `<main class="auth-page">
    <section class="auth-art">
      <div class="python-window">
        <div class="window-bar">
          <i></i><i></i><i></i>
          <span>pixelstart.py</span>
        </div>
        <div class="python-logo">
          <span class="brand-mark"><i></i><i></i><i></i><i></i></span>
          <strong>pixel<span>start</span></strong>
          <b>kids</b>
        </div>
        <pre>def <em>learn</em>(idea):
    project = build(idea)
    return <mark>level_up</mark>(project)</pre>
      </div>
    </section>
    <section class="auth-side">
      <div class="auth-card">
        <p class="eyebrow">${kicker}</p>
        <h1>${title}</h1>
        <p class="muted">${description}</p>
        ${form}
      </div>
    </section>
  </main>`;
}

function loginView() {
  const form = `<form data-form="login">
    <label>Логин или почта<input name="login" required placeholder="masha_10"></label>
    <label>Пароль<input name="password" type="password" required placeholder="••••••••"></label>
    <button class="button dark" type="submit">Войти <span>↗</span></button>
  </form>
  <a href="#register" class="form-link">Создать аккаунт</a>
  <a href="#reset" class="form-link">Восстановить пароль</a>`;
  
  return authLayout(
    'Вход в платформу',
    'Продолжим<br><em>собирать?</em>',
    'Войди, чтобы увидеть свои курсы, задания и прогресс.',
    form
  );
}

function registerView() {
  const form = `<form data-form="register">
    <div class="two-fields">
      <label>Имя<input name="first_name" required></label>
      <label>Фамилия<input name="last_name" required></label>
    </div>
    <label>Логин<input name="username" required minlength="3"></label>
    <label>Почта<input name="email" type="email" required></label>
    <label>Пароль<input name="password" type="password" required minlength="8"></label>
    <label class="check">
      <input name="terms" type="checkbox" required>
      Принимаю пользовательское соглашение
    </label>
    <button class="button dark" type="submit">Зарегистрироваться <span>↗</span></button>
  </form>
  <a href="#login" class="form-link">Уже есть аккаунт</a>`;
  
  return authLayout(
    'Новый аккаунт',
    'Создай свой<br><em>маршрут</em>',
    'Заполни данные ученика. После этого можно будет выбрать курс и поток.',
    form
  );
}

function resetView() {
  const form = `<form data-form="reset">
    <label>Логин или почта<input name="identity" required></label>
    <button class="button dark" type="submit">Запросить код <span>↗</span></button>
  </form>
  <a href="#login" class="form-link">Вернуться ко входу</a>`;
  
  return authLayout(
    'Восстановление',
    'Вернём<br><em>доступ</em>',
    'Backend-прототип пока не отправляет email-коды, но запрос подготовлен под будущий сервис.',
    form
  );
}

function homeView() {
  return `<main class="public-home">
    <header class="public-nav">
      <a class="brand" href="#home">
        <span class="brand-mark"><i></i><i></i><i></i><i></i></span>
        <span>pixel<span>start</span><b>kids</b></span>
      </a>
      <nav>
        <a href="#catalog">Курсы</a>
        <a href="#login">Войти</a>
        <a class="button dark" href="#register">Начать обучение <span>↗</span></a>
      </nav>
    </header>
    <section class="public-hero">
      <div>
        <p class="eyebrow">Онлайн-платформа для 1–9 класса</p>
        <h1>Играй.<br><em>Создавай.</em><br>Программируй.</h1>
        <p>Курсы по Scratch, Minecraft Education и алгоритмам. Ребёнок видит результат, родитель видит прогресс.</p>
        <div class="hero-actions">
          <a class="button dark" href="#catalog">Посмотреть курсы <span>↗</span></a>
          <a class="text-link" href="#register">Создать аккаунт</a>
        </div>
      </div>
      <div class="home-terminal">
        <div class="window-bar"><i></i><i></i><i></i><span>first_project.py</span></div>
        <div class="home-terminal-logo">
          <span class="brand-mark"><i></i><i></i><i></i><i></i></span>
          <strong>pixel<span>start</span></strong>
        </div>
        <pre>project = <mark>build</mark>(idea)
if project.ready:
    print(<em>"level up!"</em>)</pre>
      </div>
    </section>
    <section class="home-modules">
      <article><span>01</span><h2>Scratch</h2><p>Собери первую игру из блоков.</p></article>
      <article><span>02</span><h2>Minecraft</h2><p>Запрограммируй свой цифровой мир.</p></article>
      <article><span>03</span><h2>Алгоритмы</h2><p>Научись решать задачи кодом.</p></article>
    </section>
    <section class="home-parent">
      <p class="eyebrow">Для родителей</p>
      <h2>Всё обучение<br><em>в одном месте</em></h2>
      <p>Профиль, расписание, задания, оценки и сообщения куратора привязаны к аккаунту ребёнка.</p>
      <a class="button dark" href="#register">Подобрать маршрут <span>↗</span></a>
    </section>
  </main>`;
}

function journalView() {
  const stats = `<div class="stats">
    <div class="stat lime">
      <small>Прогресс курса</small>
      <strong>68%</strong>
      <div class="progress"><span style="width:68%"></span></div>
    </div>
    <div class="stat blue">
      <small>Рейтинг</small>
      <strong>4.8</strong>
      <span>общая оценка</span>
    </div>
    <div class="stat yellow">
      <small>Серия</small>
      <strong>6 дней</strong>
      <span>без пропусков</span>
    </div>
  </div>`;
  
  const next = card(`
    <p class="eyebrow">Ближайшее задание</p>
    <h2>Условия в игре</h2>
    <p>Научись менять правила мира, когда герой касается объекта.</p>
    ${button('Открыть задания →', 'open-tasks')}
  `);
  
  const schedule = card(`
    <p class="eyebrow">Расписание аккаунта</p>
    <div id="schedule-list"><p class="muted">Загрузка...</p></div>
  `);
  
  const history = card(`
    <p class="eyebrow">История заданий</p>
    <div id="history-list"><p class="muted">Загрузка...</p></div>
  `);
  
  const broadcasts = card(`
    <p class="eyebrow">Объявления потока</p>
    <div id="broadcast-list"><p class="muted">Выбери поток в «Мои курсы».</p></div>
  `);
  
  const content = pageHead(
    'Мой учебный маршрут',
    'Сегодня можно<br><em>сделать больше</em>',
    'Здесь собраны расписание, задания и обратная связь, привязанные к твоему аккаунту.'
  ) + stats + `<div class="two-col">${next}${schedule}</div><div class="two-col">${broadcasts}${history}</div>`;
  
  return shell(content, 'Журнал');
}

function coursesView() {
  const content = pageHead(
    'Активные маршруты',
    'Мои <em>курсы</em>',
    'Данные загружаются из потоков, доступных твоему аккаунту.'
  ) + '<div id="my-courses" class="loading">Загрузка курсов...</div>' +
  '<div class="inline-actions">' + button('Открыть каталог +', 'catalog', 'button soft') + '</div>';
  
  return shell(content, 'Мои курсы');
}

function catalogView() {
  const content = pageHead(
    'Найди следующий интерес',
    'Каталог <em>курсов</em>',
    'Курсы приходят из API. Доступ проверяется backend по оплате или участию в потоке.'
  ) + '<div id="catalog-grid" class="course-grid loading">Загрузка каталога...</div>';
  
  return shell(content, 'Каталог');
}

function profileView() {
  const name = state.user?.first_name || 'ученик';
  
  const profile = `<div class="profile-head">
    <div class="profile-avatar">${esc(name.slice(0, 1))}</div>
    <div>
      <h2>${esc(state.user?.first_name || '')} ${esc(state.user?.last_name || '')}</h2>
      <p>${esc(state.user?.username || '')} · ${esc(state.user?.email || '')}</p>
      <span class="role">${esc(state.user?.role || 'student')}</span>
    </div>
  </div>`;
  
  const about = card(`
    <p class="eyebrow">О себе</p>
    <p>${esc(state.user?.description || 'Описание пока не добавлено.')}</p>
    ${button('Изменить профиль →', 'settings', 'button soft')}
  `);
  
  const paymentStatus = state.user?.payment ? 'Курс оплачен' : 'Оплата не подтверждена';
  
  const payment = card(`
    <p class="eyebrow">Оплата</p>
    <h2>${paymentStatus}</h2>
    <p>Статус приходит из поля payment текущего аккаунта.</p>
  `);
  
  const content = pageHead(
    'Твой профиль',
    'Привет, <em>' + esc(name) + '</em>',
    'Имя, роль, описание, рейтинг и настройки связаны с текущим JWT-пользователем.'
  ) + profile + `<div class="two-col">${about}${payment}</div>`;
  
  return shell(content, 'Профиль');
}

function settingsView() {
  const form = `<form data-form="settings">
    <div class="two-fields">
      <label>Имя<input name="first_name" value="${esc(state.user?.first_name)}" required></label>
      <label>Фамилия<input name="last_name" value="${esc(state.user?.last_name)}" required></label>
    </div>
    <label>Почта<input name="email" type="email" value="${esc(state.user?.email)}" required></label>
    <label>Описание<textarea name="description">${esc(state.user?.description || '')}</textarea></label>
    <label>Новый пароль<input name="password" type="password" minlength="8" placeholder="Оставьте пустым без изменений"></label>
    <div class="form-actions">
      ${button('Применить изменения', 'save-settings', 'button lime')}
    </div>
  </form>`;
  
  const tabs = `<div class="settings-tabs">
    <button class="tab active">Профиль</button>
    <button class="tab" data-action="theme">Тема</button>
    <button class="tab" data-action="delete-account">Удаление</button>
  </div>`;
  
  const content = pageHead(
    'Личные данные',
    'Настройки',
    'Применение формы отправляет PATCH /users/me и обновляет профиль после ответа API.'
  ) + tabs + card(form);
  
  return shell(content, 'Настройки');
}

function taskView() {
  const tablet = `<div class="tablet">
    <div class="tablet-head">
      <span class="brand-mini">PIXELSTART / TASKS</span>
      <strong id="task-counter">01 / 01</strong>
    </div>
    <div id="task-content"><p class="muted">Загрузка заданий...</p></div>
    <div class="tablet-footer">
      ${button('← Назад', 'task-prev', 'button soft')}
      ${button('Сохранить ответ', 'submit-task', 'button dark')}
    </div>
  </div>`;
  
  const content = pageHead(
    'Задания',
    'Планшет <em>практики</em>',
    'Ответ сохраняется через POST submission и получает grade=0 до проверки куратором.'
  ) + tablet;
  
  return shell(content, 'Задания');
}

function adminView() {
  const courseForm = `<p class="eyebrow">Создать курс</p>
    <form data-form="course">
      <label>Название<input name="title" required placeholder="Игры в Scratch"></label>
      <label>Описание<textarea name="description"></textarea></label>
      <label>Тип<select name="type">
        <option value="scratch">scratch</option>
        <option value="minecraft_edu">minecraft_edu</option>
        <option value="algorithm">algorithm</option>
        <option value="custom">custom</option>
      </select></label>
      ${button('Создать курс', 'create-course', 'button dark')}
    </form>`;
  
  const streamForm = `<p class="eyebrow">Создать поток</p>
    <form data-form="stream">
      <label>Курс<select name="course_id" id="stream-course-options"></select></label>
      <label>Название<input name="name" required placeholder="Первые игры"></label>
      <label>Куратор (ID)<input name="curator_id" type="number" required placeholder="2"></label>
      <div class="two-fields">
        <label>Начало<input name="start_date" type="datetime-local" required></label>
        <label>Конец<input name="end_date" type="datetime-local" required></label>
      </div>
      ${button('Создать поток', 'create-stream', 'button lime')}
    </form>`;
  
  const users = `<div class="section-row">
    <div>
      <p class="eyebrow">Пользователи</p>
      <h2>Роли и оплата</h2>
    </div>
    ${button('Загрузить пользователей', 'load-users', 'button soft')}
  </div>
  <div id="admin-users"><p class="muted">Нажми «Загрузить пользователей».</p></div>`;
  
  const stats = `<div class="stats">
    <div class="stat lime"><small>Ученики</small><strong id="admin-students">—</strong></div>
    <div class="stat blue"><small>Курсы</small><strong>${state.courses.length}</strong></div>
    <div class="stat yellow"><small>Потоки</small><strong>${state.streams.length}</strong></div>
  </div>`;
  
  const content = pageHead(
    'Служебная зона · admin',
    'Центр <em>управления</em>',
    'Панель видна только пользователю с role=admin.'
  ) + stats + `<div class="two-col">${card(courseForm)}${card(streamForm)}</div>` + card(users);
  
  return shell(content, 'Админ-панель');
}

function curatorView() {
  const broadcast = `<p class="eyebrow">Публикация</p>
    <form data-form="broadcast">
      <label>Поток ID<input name="stream_id" type="number" required placeholder="1"></label>
      <label>Объявление<textarea name="text" required placeholder="Новость для потока..."></textarea></label>
      ${button('Опубликовать объявление', 'create-broadcast', 'button dark')}
    </form>`;
  
  const participants = `<p class="eyebrow">Участники</p>
    <form data-form="participants">
      <label>Поток ID<input name="stream_id" type="number" required placeholder="1"></label>
      ${button('Загрузить участников', 'load-participants', 'button soft')}
    </form>
    <div id="participants-list"></div>`;
  
  const grade = `<p class="eyebrow">Проверка работы</p>
    <form data-form="grade">
      <div class="two-fields">
        <label>Поток ID<input name="stream_id" type="number" required></label>
        <label>Задание ID<input name="task_id" type="number" required></label>
        <label>Submission ID<input name="submission_id" type="number" required></label>
        <label>Оценка<input name="grade" type="number" min="-1" max="100" required></label>
      </div>
      <label>Обратная связь<textarea name="feedback_message"></textarea></label>
      ${button('Сохранить оценку', 'grade-submission', 'button lime')}
    </form>`;
  
  const content = pageHead(
    'Служебная зона · curator',
    'Проведи поток<br><em>до результата</em>',
    'Куратор видит только свой поток, участников, объявления и проверки.'
  ) + `<div class="two-col">${card(broadcast)}${card(participants)}</div>` + card(grade);
  
  return shell(content, 'Панель куратора');
}

function render() {
  if (!state.user && !['home', 'login', 'register', 'reset'].includes(state.route)) {
    state.route = 'login';
    location.hash = 'login';
  }
  
  const views = {
    home: homeView,
    login: loginView,
    register: registerView,
    reset: resetView,
    journal: journalView,
    courses: coursesView,
    catalog: catalogView,
    profile: profileView,
    settings: settingsView,
    tasks: taskView,
    admin: adminView,
    curator: curatorView
  };
  
  if (views[state.route]) {
    app.innerHTML = views[state.route]();
  }
  
  bind();
  loadData();
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function bind() {
  document.querySelectorAll('[data-action]').forEach((element) => {
    element.addEventListener('click', () => {
      handleAction(element.dataset.action, element);
    });
  });
  
  document.querySelectorAll('[data-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      handleForm(form.dataset.form, form);
    });
  });
}

async function handleForm(type, form) {
  const data = formValues(form);
  
  try {
    if (type === 'login') {
      const tokens = await api.login(data);
      localStorage.setItem('pixelstart_access_token', tokens.access_token);
      localStorage.setItem('pixelstart_refresh_token', tokens.refresh_token);
      state.user = await api.me();
      notify('Вход выполнен.');
      location.hash = 'journal';
      
    } else if (type === 'register') {
      await api.register(data);
      notify('Аккаунт создан. Теперь войдите.');
      location.hash = 'login';
      
    } else if (type === 'reset') {
      notify('Запрос принят. Email-код подключается через отдельный сервис.');
      
    } else if (type === 'settings') {
      if (!data.password) delete data.password;
      state.user = await api.updateMe(data);
      notify('Изменения применены.');
      render();
      
    } else if (type === 'course') {
      await api.adminCourses(data);
      notify('Курс создан.');
      state.courses = await api.courses();
      render();
      
    } else if (type === 'stream') {
      const payload = {
        ...data,
        course_id: Number(data.course_id),
        curator_id: Number(data.curator_id),
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString()
      };
      await api.adminStreams(payload);
      notify('Поток создан.');
      state.streams = await api.streams();
      render();
      
    } else if (type === 'broadcast') {
      await api.createBroadcast(Number(data.stream_id), data.text);
      notify('Объявление опубликовано.');
      form.reset();
      
    } else if (type === 'participants') {
      const participants = await api.curatorParticipants(Number(data.stream_id));
      const html = participants.map((item) => {
        return `<p class="result-row">Ученик #${item.user_id} · <strong>${esc(item.status)}</strong></p>`;
      }).join('') || '<p class="muted">Участников пока нет.</p>';
      
      document.querySelector('#participants-list').innerHTML = html;
      notify('Участники загружены.');
      
    } else if (type === 'grade') {
      await api.gradeSubmission(
        Number(data.stream_id),
        Number(data.task_id),
        Number(data.submission_id),
        {
          grade: Number(data.grade),
          feedback_message: data.feedback_message
        }
      );
      notify('Оценка и обратная связь сохранены.');
      form.reset();
    }
  } catch (error) {
    notify(error.message, true);
  }
}

async function handleAction(action, element) {
  try {
    if (action === 'logout') {
      localStorage.clear();
      state.user = null;
      location.hash = 'login';
    }
    
    if (action === 'health') {
      await api.health();
      notify('Backend отвечает: health ok.');
    }
    
    if (action === 'open-tasks') location.hash = 'tasks';
    if (action === 'settings') location.hash = 'settings';
    if (action === 'catalog') location.hash = 'catalog';
    
    const submitActions = [
      'save-settings',
      'create-course',
      'create-stream',
      'create-broadcast',
      'load-participants',
      'grade-submission'
    ];
    
    if (submitActions.includes(action)) {
      element.closest('form')?.requestSubmit();
    }
    
    if (action === 'theme') {
      document.body.classList.toggle('dark-theme');
      const isDark = document.body.classList.contains('dark-theme');
      localStorage.setItem('pixelstart_theme', isDark ? 'dark' : 'light');
      notify('Тема применена.');
    }
    
    if (action === 'delete-account' && confirm('Удалить аккаунт? Это действие нельзя отменить.')) {
      await api.deleteMe();
      localStorage.clear();
      state.user = null;
      location.hash = 'login';
      notify('Аккаунт удалён.');
    }
    
    if (action === 'load-users') {
      await loadUsers();
    }
  } catch (error) {
    notify(error.message, true);
  }
}

async function loadUsers() {
  const users = await api.adminUsers();
  
  const html = users.map((user) => {
    const paymentStatus = user.payment ? 'Оплачено' : 'Не оплачено';
    return `<div class="result-row">
      <strong>${esc(user.first_name)} ${esc(user.last_name)}</strong> · 
      ${esc(user.role)} · 
      ${paymentStatus}
    </div>`;
  }).join('') || '<p class="muted">Пользователей нет.</p>';
  
  document.querySelector('#admin-users').innerHTML = html;
  notify('Пользователи загружены.');
}

async function loadData() {
  try {
    if (state.route === 'catalog' || state.route === 'admin') {
      state.courses = await api.courses();
    }
    
    if (state.route === 'courses' || state.route === 'journal' || state.route === 'admin') {
      state.streams = await api.streams();
    }
    
    if (state.route === 'catalog') {
      const coursesHtml = state.courses.map((course) => {
        const colorClass = course.type === 'scratch' ? 'green' 
          : course.type === 'minecraft_edu' ? 'blue' 
          : 'coral';
        
        return `<article class="course-card">
          <div class="course-art ${colorClass}">
            <span class="art-label">${esc(course.type)}</span>
            <div class="art-block">&lt;/&gt;</div>
          </div>
          <div class="course-body">
            <h2>${esc(course.title)}</h2>
            <p>${esc(course.description)}</p>
            ${button('Открыть курс', 'select-course', 'button dark', `data-course-id="${course.id}"`)}
          </div>
        </article>`;
      }).join('') || '<p class="muted">Курсов пока нет.</p>';
      
      document.querySelector('#catalog-grid').innerHTML = coursesHtml;
      
      document.querySelectorAll('[data-action="select-course"]').forEach((item) => {
        item.addEventListener('click', () => {
          notify(`Курс #${item.dataset.courseId} выбран. Для заявки нужен поток.`);
        });
      });
    }
    
    if (state.route === 'courses') {
      const streamsHtml = state.streams.map((stream) => {
        return `<article class="course-row">
          <div>
            <p class="eyebrow">Поток</p>
            <h2>${esc(stream.name)}</h2>
            <p>Курс #${stream.course_id}</p>
          </div>
          ${button('Открыть задания', 'open-tasks', 'button dark')}
        </article>`;
      }).join('') || '<p class="muted">Потоков пока нет.</p>';
      
      document.querySelector('#my-courses').innerHTML = streamsHtml;
    }
    
    if (state.route === 'admin' && document.querySelector('#stream-course-options')) {
      const optionsHtml = state.courses.map((course) => {
        return `<option value="${course.id}">${esc(course.title)}</option>`;
      }).join('');
      
      document.querySelector('#stream-course-options').innerHTML = optionsHtml;
    }
    
    if (state.route === 'journal') {
      const history = await api.history().catch(() => []);
      
      const historyHtml = history.map((item) => {
        return `<p class="result-row">Задание #${item.task_id} · оценка ${item.grade}</p>`;
      }).join('') || '<p class="muted">История пока пустая.</p>';
      
      document.querySelector('#history-list').innerHTML = historyHtml;
    }
  } catch (error) {
    notify(error.message, true);
  }
}

window.addEventListener('hashchange', () => {
  state.route = location.hash.slice(1) || 'home';
  render();
});

async function boot() {
  document.body.classList.toggle('dark-theme', localStorage.getItem('pixelstart_theme') === 'dark');
  
  const token = localStorage.getItem('pixelstart_access_token');
  if (token) {
    state.user = await api.me().catch(() => null);
  }
  
  render();
}

boot();
