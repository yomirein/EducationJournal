(function() {
  const t = localStorage.getItem('pixelstart_theme') === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  if (t === 'dark') {
    document.documentElement.classList.add('dark');
  }
})();

const api = window.pixelApi;
const toast = document.querySelector('.toast');

const showMessage = (message, isError = false) => {
  if (!toast) return;
  
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('visible');
  
  window.clearTimeout(window.pixelToast);
  window.pixelToast = setTimeout(() => {
    toast.classList.remove('visible');
  }, 3200);
};

const run = async (action, success) => {
  try {
    await action();
    if (success) showMessage(success);
  } catch (error) {
    showMessage(error.message, true);
  }
};

document.querySelectorAll('[data-toast]').forEach(button => {
  button.addEventListener('click', () => {
    showMessage(button.dataset.toast);
  });
});

document.querySelectorAll('.reveal').forEach(item => {
  if (!('IntersectionObserver' in window)) {
    item.classList.add('visible');
  } else {
    new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 }).observe(item);
  }
});

const formJson = form => Object.fromEntries(new FormData(form).entries());

const bind = (selector, callback) => {
  document.querySelector(selector)?.addEventListener('submit', event => {
    event.preventDefault();
    callback(event.currentTarget);
  });
};

/* --- Global Forms Binding --- */
bind('[data-form="login"]', form => run(async () => {
  const res = await api.post('/auth/login', formJson(form));
  api.auth.save(res);
  const me = await api.get('/users/me').catch(() => null);
  if (me?.role === 'curator') window.location.href = '../curator/index.html';
  else if (me?.role === 'admin') window.location.href = '../admin/index.html';
  else window.location.href = '../student/index.html';
}, 'Вход выполнен.'));

bind('[data-form="register"]', form => run(async () => {
  await api.post('/auth/register', formJson(form));
  window.location.href = 'login.html';
}, 'Аккаунт создан. Теперь войдите.'));

bind('[data-form="profile"]', form => run(async () => {
  const user = await api.patch('/users/me', formJson(form));
  localStorage.setItem('pixelstart_user', JSON.stringify(user));
}, 'Профиль сохранён.'));

bind('[data-form="course-create"]', form => run(async () => {
  const course = await api.post('/panel/courses', formJson(form));
  form.reset();
  const res = document.querySelector('[data-result]');
  if (res) res.textContent = `Курс #${course.id} создан.`;
}, 'Курс успешно создан.'));

bind('[data-form="lesson-create"]', form => run(async () => {
  const lesson = await api.post('/panel/lessons', {
    module_id: Number(form.module_id.value),
    type: form.type.value,
    duration: Number(form.duration.value || 0)
  });
  form.reset();
  document.querySelector('[data-result]')?.replaceChildren(
    document.createTextNode(`Урок #${lesson.id} создан.`)
  );
}, 'Урок создан.'));

bind('[data-form="task-create"]', form => run(async () => {
  const task = await api.post(`/panel/lessons/${form.lesson_id.value}/tasks`, {
    type: form.type.value,
    description: form.description.value,
    answer_json: null
  });
  form.reset();
  document.querySelector('[data-result]')?.replaceChildren(
    document.createTextNode(`Задание #${task.id} создано.`)
  );
}, 'Задание создано.'));

bind('[data-form="stream-create"]', form => run(async () => {
  await api.post('/panel/streams', {
    ...formJson(form),
    course_id: Number(form.course_id.value),
    curator_id: Number(form.curator_id.value),
    start_date: new Date(form.start_date.value).toISOString(),
    end_date: new Date(form.end_date.value).toISOString()
  });
  form.reset();
}, 'Поток создан.'));

bind('[data-form="broadcast"]', form => run(async () => {
  await api.post(`/streams/${form.stream_id.value}/broadcasts`, {
    text: form.text.value
  });
  form.reset();
}, 'Объявление опубликовано.'));

bind('[data-form="submit-task"]', form => run(async () => {
  let fileId = null;
  const file = form.file?.files?.[0];
  
  if (file) {
    const upload = new FormData();
    upload.append('file', file);
    fileId = (await api.upload('/files', upload)).file_id;
  }
  
  await api.post(`/courses/${form.course_id.value}/tasks/${form.task_id.value}/submissions`, {
    input: form.input.value,
    file_id: fileId
  });
  triggerCelebration('Ответ отправлен', 'Задание передано на проверку куратору.', 50);
}, 'Ответ отправлен на проверку.'));

bind('[data-form="grade"]', form => run(async () => {
  await api.patch(
    `/streams/${form.stream_id.value}/tasks/${form.task_id.value}/submissions/${form.submission_id.value}`,
    {
      grade: Number(form.grade.value),
      feedback_message: form.feedback_message.value
    }
  );
  if (typeof window.refreshCuratorReview === 'function') {
    window.refreshCuratorReview();
  }
}, 'Оценка сохранена.'));

bind('[data-form="participant-decision"]', form => run(async () => {
  await api.post(
    `/streams/${form.stream_id.value}/participants/${form.user_id.value}/${form.decision.value}`,
    {}
  );
  if (typeof window.refreshCuratorParticipants === 'function') {
    window.refreshCuratorParticipants();
  }
}, 'Решение по заявке применено.'));

bind('[data-form="reject-file"]', form => run(async () => {
  await api.delete(
    `/streams/${form.stream_id.value}/tasks/${form.task_id.value}/submissions/${form.submission_id.value}/file?reason=${encodeURIComponent(form.reason.value)}`
  );
}, 'Файл удалён, причина сохранена.'));

bind('[data-form="user-patch"]', form => run(async () => {
  await api.patch(`/panel/users/${form.user_id.value}`, {
    role: form.role.value,
    payment: form.payment.value === 'true'
  });
}, 'Пользователь обновлён.'));

/* --- Logout --- */
document.querySelectorAll('[data-logout]').forEach(button => {
  button.addEventListener('click', () => {
    api.auth.clear();
    window.location.href = '../index.html';
  });
});

/* --- User profile hydration --- */
if (api.auth.access) {
  api.get('/users/me').then(user => {
    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = `${user.first_name} ${user.last_name}`;
    });
    document.querySelectorAll('[data-user-role]').forEach(el => {
      el.textContent = `${user.email} (${user.role})`;
    });
    const descField = document.querySelector('#description');
    if (descField && user.description) descField.value = user.description;
    const emailField = document.querySelector('#email');
    if (emailField && user.email) emailField.value = user.email;
  }).catch(() => {});
}

/* ==========================================================================
   DELUXE FEATURE 1: CONFETTI & CELEBRATION ENGINE (STRICTLY NO STICKERS)
   ========================================================================== */
function playVictoryChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const startTime = ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.08);
      gain.gain.setValueAtTime(0.18, startTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime + idx * 0.08);
      osc.stop(startTime + idx * 0.08 + 0.45);
    });
  } catch (e) {}
}

function triggerCelebration(title = 'Уровень пройден', subtitle = 'Алгоритм успешно выполнен', xp = 100) {
  playVictoryChime();

  let modal = document.querySelector('.celebration-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'celebration-modal';
    modal.innerHTML = `
      <canvas class="celebration-canvas"></canvas>
      <div class="celebration-card">
        <div class="celebration-badge-icon">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#b8f34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 class="celebration-title"></h2>
        <p class="celebration-subtitle"></p>
        <div class="celebration-xp-pill">+<span class="xp-val"></span> XP начислено</div>
        <div>
          <button class="button button-lime close-celebration">Продолжить</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-celebration').addEventListener('click', () => {
      modal.classList.remove('visible');
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('visible');
    });
  }

  modal.querySelector('.celebration-title').textContent = title;
  modal.querySelector('.celebration-subtitle').textContent = subtitle;
  modal.querySelector('.xp-val').textContent = xp;
  modal.classList.add('visible');

  // Confetti particles
  const canvas = modal.querySelector('.celebration-canvas');
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const colors = ['#b8f34a', '#ffdf66', '#9edbf4', '#ff9d82', '#ffffff'];
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.75) * 18,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 12,
        life: 1,
        decay: Math.random() * 0.012 + 0.008
      });
    }

    let animId;
    function renderConfetti() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38;
        p.rotation += p.rSpeed;
        p.life -= p.decay;
        if (p.life > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });
      if (alive) {
        animId = requestAnimationFrame(renderConfetti);
      }
    }
    renderConfetti();
  }
}
window.triggerCelebration = triggerCelebration;

function playChime(success) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {}
}
window.playChime = playChime;

/* ==========================================================================
   DELUXE FEATURE 1.5: CENTRAL THEME SYSTEM (LIGHT / DARK)
   ========================================================================== */
function getActiveTheme() {
  return localStorage.getItem('pixelstart_theme') === 'dark' ? 'dark' : 'light';
}

function updateThemeToggleButtons(isDark) {
  // 1. Topbar theme toggles across the page
  document.querySelectorAll('.topbar-theme-toggle').forEach(btn => {
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;">
        ${isDark 
          ? '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
          : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'
        }
      </svg>
      <span>${isDark ? 'Светлая тема' : 'Тёмная тема'}</span>
    `;
    btn.setAttribute('title', isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему');
  });

  // 2. Demo switcher theme toggle button
  const demoToggle = document.getElementById('global-theme-toggle');
  if (demoToggle) {
    demoToggle.textContent = isDark ? 'Светлая тема' : 'Тёмная тема';
  }

  // 3. Settings page buttons
  document.querySelectorAll('[data-theme]').forEach(btn => {
    const active = (btn.dataset.theme === 'dark' && isDark) || (btn.dataset.theme === 'light' && !isDark);
    btn.classList.toggle('active-theme', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function applyTheme(themeName, showToast = true) {
  const isDark = themeName === 'dark';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', isDark);
  if (document.body) {
    document.body.classList.toggle('dark-theme', isDark);
  }
  localStorage.setItem('pixelstart_theme', isDark ? 'dark' : 'light');
  updateThemeToggleButtons(isDark);
  if (showToast) {
    showMessage(`Тема переключена: ${isDark ? 'Тёмная' : 'Светлая'}`);
  }
}

function initTopbarThemeToggle() {
  const topbar = document.querySelector('.topbar');
  if (!topbar || topbar.querySelector('.topbar-theme-toggle')) return;

  let actions = topbar.querySelector('.top-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'top-actions';
    topbar.appendChild(actions);
  }

  const isDark = getActiveTheme() === 'dark';
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'topbar-theme-toggle';
  toggleBtn.id = 'topbar-theme-toggle';
  actions.prepend(toggleBtn);

  toggleBtn.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme === 'dark';
    applyTheme(current ? 'light' : 'dark', true);
  });

  updateThemeToggleButtons(isDark);
}

/* ==========================================================================
   DELUXE FEATURE 2: HACKATHON DEMO QUICK-SWITCHER & QUICK-NAV (CLEAN / NO EMOJIS)
   ========================================================================== */
function initDemoSwitcher() {
  if (document.querySelector('.demo-switcher')) return;

  const path = window.location.pathname;
  let currentRole = 'student';
  if (path.includes('/curator/')) currentRole = 'curator';
  else if (path.includes('/admin/')) currentRole = 'admin';

  const isDark = getActiveTheme() === 'dark';
  const switcher = document.createElement('aside');
  switcher.className = 'demo-switcher';
  switcher.setAttribute('aria-label', 'Панель быстрого переключения ролей и навигации');
  
  switcher.innerHTML = `
    <div class="demo-tray" id="demo-nav-tray">
      <div class="demo-tray-section">
        <span class="demo-tray-label">Быстрый переход к курсам:</span>
        <div class="demo-tray-grid">
          <a class="demo-tray-link" href="/student/course/tasks.html?course=7" title="Курс 1: Алгоритмы и Scratch">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>Scratch 3.0</span>
          </a>
          <a class="demo-tray-link" href="/student/course/tasks.html?course=8" title="Курс 2: Minecraft & MakeCode">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            <span>Кумир-Крафт</span>
          </a>
          <a class="demo-tray-link" href="/student/course/tasks.html?course=9" title="Курс 3: Python 3 & Олимпиады">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            <span>Python 3 IDE</span>
          </a>
          <a class="demo-tray-link" href="/curator/review.html" title="Панель куратора: проверка решений">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>Очередь куратора</span>
          </a>
          <a class="demo-tray-link" href="/student/catalog.html" title="Каталог курсов">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>Каталог курсов</span>
          </a>
          <a class="demo-tray-link" href="/student/course/lessons.html" title="Учебный план">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span>Уроки</span>
          </a>
        </div>
      </div>
      <div style="font-size:10px; color:#8da498; text-align:right;">Горячая клавиша: Shift + D</div>
    </div>

    <div style="display:flex; align-items:center; gap:6px;">
      <button class="demo-role-btn" id="demo-tray-toggle" type="button" title="Открыть быстрое меню навигации">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <span class="demo-switcher-label">ДЕМО-РОЛЬ:</span>
      <button class="demo-role-btn ${currentRole === 'student' ? 'active' : ''}" data-role-switch="student" title="Войти как Иван Учеников">Ученик</button>
      <button class="demo-role-btn ${currentRole === 'curator' ? 'active' : ''}" data-role-switch="curator" title="Войти как Анна Кураторова">Куратор</button>
      <button class="demo-role-btn ${currentRole === 'admin' ? 'active' : ''}" data-role-switch="admin" title="Войти как Администратор">Админ</button>
      <button class="demo-role-btn" id="global-theme-toggle" title="Переключить тему">${isDark ? 'Светлая тема' : 'Тёмная тема'}</button>
    </div>
  `;
  if (document.body) {
    document.body.appendChild(switcher);
  }

  const tray = switcher.querySelector('#demo-nav-tray');
  const trayToggle = switcher.querySelector('#demo-tray-toggle');
  trayToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    tray.classList.toggle('is-open');
  });

  document.addEventListener('click', (e) => {
    if (!switcher.contains(e.target)) {
      tray.classList.remove('is-open');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.shiftKey && (e.key === 'D' || e.key === 'в' || e.key === 'В')) {
      tray.classList.toggle('is-open');
    }
  });

  const themeToggle = switcher.querySelector('#global-theme-toggle');
  themeToggle?.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme, true);
  });

  const creds = {
    student: { login: 'student', password: 'student12345', target: '/student/index.html' },
    curator: { login: 'curator', password: 'curator12345', target: '/curator/index.html' },
    admin: { login: 'admin', password: 'admin12345', target: '/admin/index.html' }
  };

  switcher.querySelectorAll('[data-role-switch]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const role = btn.dataset.roleSwitch;
      const c = creds[role];
      if (!c) return;
      try {
        btn.textContent = '...';
        const tokenPair = await api.post('/auth/login', { login: c.login, password: c.password });
        api.auth.save(tokenPair);
        showMessage(`Переключение: ${role.toUpperCase()}`);
        setTimeout(() => {
          window.location.href = c.target;
        }, 200);
      } catch (err) {
        showMessage('Ошибка переключения роли: ' + err.message, true);
        btn.textContent = role === 'student' ? 'Ученик' : role === 'curator' ? 'Куратор' : 'Админ';
      }
    });
  });
}

/* ==========================================================================
   DELUXE FEATURE 3: ALL-IN-ONE SPLIT STUDIO WORKBENCH (tasks.html)
   ========================================================================== */
function initTasksPage() {
  const taskPage = document.querySelector('.task-page');
  const studioRoot = document.getElementById('studio-tablet-root');
  if (!taskPage && !studioRoot) return;

  initAiCodeInspector();

  const urlParams = new URLSearchParams(window.location.search);
  let requestedTaskId = urlParams.get('task') ? Number(urlParams.get('task')) : null;

  run(async () => {
    let courseId = urlParams.get('course') || localStorage.getItem('pixelstart_active_course');
    if (!courseId) {
      const allCourses = await api.get('/courses').catch(() => []);
      courseId = (allCourses && allCourses.length > 0) ? String(allCourses[0].id) : '7';
    }
    localStorage.setItem('pixelstart_active_course', courseId);
    
    // Normalize URL
    if (!urlParams.get('course')) {
      const curUrl = new URL(window.location.href);
      curUrl.searchParams.set('course', courseId);
      if (requestedTaskId) curUrl.searchParams.set('task', requestedTaskId);
      window.history.replaceState(null, '', curUrl.toString());
    }

    const tasks = await api.get(`/courses/${courseId}/tasks`).catch(() => []);
    if (!tasks || tasks.length === 0) return;

    let currentTask = tasks.find(t => t.id === requestedTaskId) || tasks[0];

    // Build Stepper
    let stepperWrap = document.querySelector('[data-task-stepper-container]') || document.querySelector('[data-task-stepper]');
    if (!stepperWrap) {
      stepperWrap = document.createElement('div');
      stepperWrap.className = 'studio-stepper-wrap';
      stepperWrap.setAttribute('data-task-stepper-container', 'true');
      taskPage?.prepend(stepperWrap);
    }

    const typeIcons = {
      theory: 'T',
      quiz: '?',
      scratch: 'S',
      minecraft_edu: 'M',
      code_test: '</>',
      project: 'P'
    };

    const typeLabels = {
      theory: 'Теория',
      quiz: 'Вопрос',
      scratch: 'Scratch',
      minecraft_edu: 'Minecraft',
      code_test: 'Задача',
      project: 'Проект'
    };

    // Setup Split-View Studio Toggles
    const bodyContainer = document.getElementById('studio-body-container');
    const viewToggles = document.getElementById('studio-view-toggles');
    const fullscreenBtn = document.getElementById('studio-fullscreen-btn');

    if (viewToggles && bodyContainer) {
      viewToggles.querySelectorAll('[data-view-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.viewMode;
          viewToggles.querySelectorAll('[data-view-mode]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          bodyContainer.className = `studio-body mode-${mode}`;
        });
      });
    }

    if (fullscreenBtn && studioRoot) {
      fullscreenBtn.addEventListener('click', () => {
        studioRoot.classList.toggle('is-fullscreen');
        fullscreenBtn.classList.toggle('active', studioRoot.classList.contains('is-fullscreen'));
      });

      window.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === '[') {
          e.preventDefault();
          document.getElementById('btn-prev-step')?.click();
        } else if (e.altKey && e.key === ']') {
          e.preventDefault();
          document.getElementById('btn-next-step')?.click();
        } else if (e.altKey && (e.key === 'f' || e.key === 'F')) {
          e.preventDefault();
          fullscreenBtn.click();
        }
      });
    }

    // Workbench Header Elements
    const workbenchTitleText = document.getElementById('workbench-title-text');
    const workbenchBadge = document.getElementById('workbench-badge');
    const workbenchReloadBtn = document.getElementById('workbench-reload-btn');
    const workbenchMount = document.getElementById('workbench-content-mount');

    if (workbenchReloadBtn) {
      workbenchReloadBtn.onclick = () => {
        renderWorkbench(currentTask);
        showMessage('Интерактивная среда перезагружена');
      };
    }

    const updateFooterNav = () => {
      const footer = document.querySelector('.tablet-footer');
      if (!footer) return;
      const currentIdx = tasks.findIndex(t => t.id === currentTask.id);
      footer.innerHTML = `
        <button class="button button-soft" id="btn-prev-step" type="button" ${currentIdx === 0 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Предыдущий шаг
        </button>
        <span id="step-footer-counter" style="font-size:12px; color:var(--muted); font-weight:700;">
          Шаг ${currentIdx + 1} из ${tasks.length}
        </span>
        <button class="button button-soft" id="btn-next-step" type="button" ${currentIdx === tasks.length - 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
          Следующий шаг
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
        </button>
      `;
      footer.querySelector('#btn-prev-step')?.addEventListener('click', () => {
        if (currentIdx > 0) {
          currentTask = tasks[currentIdx - 1];
          renderTask(currentTask);
          renderStepper();
        }
      });
      footer.querySelector('#btn-next-step')?.addEventListener('click', () => {
        if (currentIdx < tasks.length - 1) {
          currentTask = tasks[currentIdx + 1];
          renderTask(currentTask);
          renderStepper();
        }
      });
    };

    const renderStepper = () => {
      stepperWrap.innerHTML = `
        <div class="task-stepper">
          ${tasks.map((t, idx) => {
            const stepNum = t.step_number || String(idx + 1).padStart(2, '0');
            const isActive = t.id === currentTask.id;
            const icon = typeIcons[t.type] || '#';
            const typeName = typeLabels[t.type] || t.type;
            return `<button class="task-step-btn ${isActive ? 'active' : ''}" data-step-task="${t.id}" title="${escapeHtml(t.title || '')}">
              <span style="opacity:0.75; font-size:10px;">${icon}</span>
              <span>${stepNum}</span>
              <span style="font-weight:400; font-size:11px;">${typeName}</span>
            </button>`;
          }).join('')}
        </div>
      `;

      stepperWrap.querySelectorAll('[data-step-task]').forEach(btn => {
        btn.addEventListener('click', () => {
          const tid = Number(btn.dataset.stepTask);
          currentTask = tasks.find(t => t.id === tid) || tasks[0];
          renderTask(currentTask);
          renderStepper();
        });
      });

      setTimeout(() => {
        stepperWrap.querySelector('.task-step-btn.active')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }, 50);
    };

    // -----------------------------------------------------------
    // RENDER WORKBENCH (RIGHT PANE)
    // -----------------------------------------------------------
    const renderWorkbench = async (task) => {
      if (!workbenchMount) return;
      workbenchMount.innerHTML = '';
      const meta = task.answer_json || {};
      const stepType = task.type || 'theory';

      // 1. SCRATCH 3.0 STUDIO
      if (stepType === 'scratch') {
        if (workbenchTitleText) workbenchTitleText.innerHTML = `Scratch 3.0 · Блочная лаборатория`;
        if (workbenchBadge) workbenchBadge.textContent = 'Интерактивно';

        const frameUrl = `/simulators/scratch-ru/embed.html?task=${encodeURIComponent(task.step_number || task.id)}&course=${courseId}`;
        workbenchMount.innerHTML = `
          <div style="flex:1; display:flex; flex-direction:column; height:100%; position:relative;">
            <iframe class="workbench-iframe" id="scratch-workbench-iframe" src="${frameUrl}"></iframe>
          </div>
        `;

        const iframe = workbenchMount.querySelector('#scratch-workbench-iframe');
        iframe.onload = () => {
          iframe.contentWindow?.postMessage({
            type: 'SCRATCH_INIT',
            config: {
              taskTitle: task.title,
              taskText: task.description,
              requiredBlocks: meta.required_blocks || ["motion_movesteps"],
              criteria: meta.criteria
            }
          }, '*');
        };
      }

      // 2. MINECRAFT EDUCATION (KUMIR-CRAFT 2D VOXEL)
      else if (stepType === 'minecraft_edu') {
        if (workbenchTitleText) workbenchTitleText.innerHTML = `Кумир-Крафт 2D · Воксельный мир`;
        if (workbenchBadge) workbenchBadge.textContent = 'Симулятор';

        let lvl = 1;
        const sNum = String(task.step_number || '');
        const sTitle = String(task.title || '').toLowerCase();
        if (sNum === '2.2.3' || sTitle.includes('стен')) lvl = 2;
        else if (sNum === '2.3.3' || sTitle.includes('мост')) lvl = 3;

        const frameUrl = `/simulators/kumir-craft/index.html?level=${lvl}&lang=ru`;
        workbenchMount.innerHTML = `
          <div style="flex:1; display:flex; flex-direction:column; height:100%; position:relative;">
            <iframe class="workbench-iframe" id="kumir-workbench-iframe" src="${frameUrl}"></iframe>
          </div>
        `;
      }

      // 3. PYTHON 3 CODE SANDBOX & TEST RUNNER
      else if (stepType === 'code_test') {
        if (workbenchTitleText) workbenchTitleText.innerHTML = `Python 3.12 · Песочница с тестами`;
        if (workbenchBadge) workbenchBadge.textContent = 'Автопроверка';

        const sampleTests = meta.sample_tests || [];
        const defaultPySnippet = `# Python 3 решение задачи\nimport sys\n\ndef main():\n    # Считывание входных данных\n    pass\n\nif __name__ == '__main__':\n    main()\n`;

        workbenchMount.innerHTML = `
          <div class="workbench-code-container">
            ${sampleTests.length > 0 ? `
              <div class="sample-tests-box" style="margin:12px; margin-bottom:8px;">
                <div class="sample-tests-header">Примеры тестов (из условия задачи)</div>
                ${sampleTests.map(st => `
                  <div class="sample-test-item">
                    <div class="sample-col">
                      <div class="sample-col-label">Входные данные (stdin):</div>
                      <code class="sample-col-code">${escapeHtml(st.input || '')}</code>
                    </div>
                    <div class="sample-col">
                      <div class="sample-col-label">Ожидаемый ответ (stdout):</div>
                      <code class="sample-col-code">${escapeHtml(st.output || '')}</code>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <div class="code-editor-wrapper" style="flex:1; display:flex; flex-direction:column; border-radius:0; border:none; margin:0 12px 12px;">
              <div class="code-editor-topbar">
                <div class="code-editor-title">
                  <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#7ee787;"></span>
                  <span>solution.py</span>
                  <span style="opacity:0.6; font-size:11px;">Лимит: ${meta.time_limit || '1.0 с'}, Память: ${meta.memory_limit || '256 МБ'}</span>
                </div>
                <button class="button button-soft" id="btn-reset-code" type="button" style="min-height:26px; padding:0 10px; font-size:11px;">
                  Сброс кода
                </button>
              </div>
              <textarea class="code-editor-textarea" id="python-code-input" spellcheck="false" style="flex:1; min-height:220px;">${defaultPySnippet}</textarea>
              <div class="code-actions-bar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <span style="font-size:12px; color:#a4c2b0;">
                  Тестов жюри: ${(sampleTests.length || 0) + (meta.hidden_tests ? meta.hidden_tests.length : 4)}
                </span>
                <div style="display:flex; gap:8px;">
                  <button class="button button-soft" id="btn-dry-run-tests" type="button" style="padding:8px 14px; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    Проверить на примерах
                  </button>
                  <button class="button button-lime" id="btn-run-code-tests" type="button" style="padding:8px 18px; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Сдать решение на оценку
                  </button>
                </div>
              </div>
              <div class="code-test-console" id="code-test-console" style="display:none; max-height:180px;"></div>
            </div>
          </div>
        `;

        const codeArea = workbenchMount.querySelector('#python-code-input');
        const consoleBox = workbenchMount.querySelector('#code-test-console');

        // Restore saved draft from localStorage
        const draftKey = `pixelstart_code_draft_${task.id}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          codeArea.value = savedDraft;
        }

        codeArea.addEventListener('input', () => {
          localStorage.setItem(draftKey, codeArea.value);
        });

        codeArea.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const start = codeArea.selectionStart;
            const end = codeArea.selectionEnd;
            codeArea.value = codeArea.value.substring(0, start) + '    ' + codeArea.value.substring(end);
            codeArea.selectionStart = codeArea.selectionEnd = start + 4;
          } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
              executeCode(false);
            } else {
              executeCode(true);
            }
          }
        });

        workbenchMount.querySelector('#btn-reset-code').onclick = () => {
          codeArea.value = defaultPySnippet;
          localStorage.removeItem(draftKey);
          showMessage('Код сброшен к начальному шаблону');
        };

        const executeCode = async (isSubmission = false) => {
          const codeVal = codeArea.value.trim();
          if (!codeVal) {
            showMessage('Введите код решения на Python.', true);
            return;
          }

          consoleBox.style.display = 'block';
          consoleBox.innerHTML = `
            <div class="console-line-info">[EXEC] Песочница Python 3.12 запущена... Лимит: ${meta.time_limit || '1.0 с'}</div>
            <div class="console-line-info">[EXEC] Компиляция и запуск тестового набора...</div>
          `;

          try {
            const endpoint = isSubmission 
              ? `/courses/${courseId}/tasks/${task.id}/submissions`
              : `/courses/${courseId}/tasks/${task.id}/run-tests`;
            const res = await api.post(endpoint, { input: codeVal });

            setTimeout(() => {
              if (res.test_details && res.test_details.length > 0) {
                res.test_details.forEach(td => {
                  if (td.status === 'OK') {
                    if (td.visibility === 'sample') {
                      consoleBox.innerHTML += `<div class="console-line-ok">[PASS] Тест #${td.num} (пример): stdin="${escapeHtml(td.input)}" -> "${escapeHtml(td.actual)}" [${td.duration_ms} мс]</div>`;
                    } else {
                      consoleBox.innerHTML += `<div class="console-line-ok">[PASS] Тест #${td.num} (скрытый тест жюри): OK [${td.duration_ms} мс]</div>`;
                    }
                  } else {
                    if (td.visibility === 'sample') {
                      consoleBox.innerHTML += `<div class="console-line-fail">[FAIL] Тест #${td.num} (${td.status}): stdin="${escapeHtml(td.input)}" | Ожидалось: "${escapeHtml(td.expected)}" | Получено: "${escapeHtml(td.actual)}" [${td.duration_ms} мс]</div>`;
                    } else {
                      consoleBox.innerHTML += `<div class="console-line-fail">[FAIL] Тест #${td.num} (${td.status}): ${escapeHtml(td.message)}</div>`;
                    }
                  }
                });
              }

              if (res.grade === 100) {
                consoleBox.innerHTML += `
                  <div class="console-line-ok" style="font-weight:700; margin-top:8px; border-top:1px solid rgba(0,255,150,0.2); padding-top:6px;">
                    [ACCEPTED] Полный балл: 100 / 100. ${isSubmission ? 'Решение зачтено в журнал!' : 'Все тесты пройдены! Можно сдавать.'}
                  </div>
                `;
                playChime(true);
                if (isSubmission) {
                  triggerCelebration('Тесты пройдены!', 'Задача полностью зачтена: 100 / 100 баллов!', 150);
                } else {
                  showMessage('Все тесты пройдены! Нажмите «Сдать решение на оценку».');
                }
              } else {
                consoleBox.innerHTML += `
                  <div class="console-line-fail" style="font-weight:700; margin-top:8px; border-top:1px solid rgba(255,100,100,0.2); padding-top:6px;">
                    [FAILED] Набрано: ${res.grade} / 100 баллов. ${escapeHtml(res.feedback_message || '')}
                  </div>
                `;
                playChime(false);
                showMessage(isSubmission ? 'Тесты не пройдены. Смотрите лог в терминале.' : 'Есть ошибки на тестах. Исправьте код.', true);
              }

              if (isSubmission) {
                renderTask(task);
                renderStepper();
              }
            }, 250);

          } catch (e) {
            consoleBox.innerHTML += `<div class="console-line-fail">> Системная ошибка выполнения: ${escapeHtml(e.message)}</div>`;
            playChime(false);
          }
        };

        workbenchMount.querySelector('#btn-dry-run-tests').onclick = () => executeCode(false);
        workbenchMount.querySelector('#btn-run-code-tests').onclick = () => executeCode(true);
      }

      // 4. QUIZ INTERACTIVE CARDS
      else if (stepType === 'quiz') {
        if (workbenchTitleText) workbenchTitleText.innerHTML = `Контрольный вопрос · Проверка знаний`;
        if (workbenchBadge) workbenchBadge.textContent = 'Тест';

        const options = meta.options || [];
        const isMultiple = meta.is_multiple || false;

        let optionsHtml = '';
        if (options.length > 0) {
          optionsHtml = `
            <p style="font-size:14px; font-weight:700; margin-bottom:14px; color:#d8e5de;">
              ${isMultiple ? 'Варианты ответов (выберите все верные):' : 'Выберите один верный вариант:'}
            </p>
            <div class="quiz-options-list">
              ${options.map((opt, oIdx) => `
                <div class="quiz-option-card ${isMultiple ? 'checkbox' : 'radio'}" data-opt-idx="${oIdx}" data-opt-val="${escapeHtml(opt)}">
                  <div class="quiz-indicator">
                    <span class="quiz-indicator-dot"></span>
                  </div>
                  <span class="quiz-option-text">${escapeHtml(opt)}</span>
                </div>
              `).join('')}
            </div>
          `;
        } else {
          optionsHtml = `
            <div style="margin:20px 0;">
              <label for="quiz-numeric-input" style="font-size:14px; font-weight:700; display:block; margin-bottom:10px; color:#d8e5de;">
                Введите числовой ответ:
              </label>
              <input type="text" id="quiz-numeric-input" class="task-answer" placeholder="Например: 45" style="max-width:280px; font-size:16px; font-weight:700; padding:12px 16px; background:#1c2520; color:#fff;" />
            </div>
          `;
        }

        workbenchMount.innerHTML = `
          <div class="workbench-quiz-container">
            ${optionsHtml}
            <div style="display:flex; justify-content:flex-end; margin-top:20px;">
              <button class="button button-lime" id="btn-submit-quiz" type="button" style="padding:12px 28px; font-size:13px; font-weight:700;">
                Проверить ответ
              </button>
            </div>
          </div>
        `;

        if (options.length > 0) {
          workbenchMount.querySelectorAll('.quiz-option-card').forEach(card => {
            card.onclick = () => {
              if (isMultiple) {
                card.classList.toggle('selected');
              } else {
                workbenchMount.querySelectorAll('.quiz-option-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
              }
            };
          });
        }

        workbenchMount.querySelector('#btn-submit-quiz').onclick = async () => {
          let answerVal = '';
          if (options.length > 0) {
            const selectedCards = workbenchMount.querySelectorAll('.quiz-option-card.selected');
            if (selectedCards.length === 0) {
              showMessage('Пожалуйста, выберите хотя бы один вариант ответа.', true);
              return;
            }
            if (isMultiple) {
              const vals = Array.from(selectedCards).map(c => c.dataset.optVal);
              answerVal = JSON.stringify(vals);
            } else {
              answerVal = selectedCards[0].dataset.optVal;
            }
          } else {
            const numInp = workbenchMount.querySelector('#quiz-numeric-input');
            answerVal = (numInp?.value || '').trim();
            if (!answerVal) {
              showMessage('Пожалуйста, введите ответ числом.', true);
              return;
            }
          }

          try {
            const res = await api.post(`/courses/${courseId}/tasks/${task.id}/submissions`, { input: answerVal });
            if (res.grade === 100) {
              playChime(true);
              triggerCelebration('Верно!', res.feedback_message || 'Ответ абсолютно правильный.', 100);
            } else {
              playChime(false);
              showMessage(res.feedback_message || 'Неверный ответ. Попробуйте ещё раз.', true);
            }
            renderTask(task);
            renderStepper();
          } catch (e) {
            showMessage('Ошибка проверки: ' + e.message, true);
          }
        };
      }

      // 5. THEORY CHECKLIST & CONFIRMATION
      else if (stepType === 'theory') {
        if (workbenchTitleText) workbenchTitleText.innerHTML = `Теоретический конспект · Изучение`;
        if (workbenchBadge) workbenchBadge.textContent = 'Материал';

        workbenchMount.innerHTML = `
          <div class="workbench-theory-container">
            <div style="background:#16201b; border:1px solid #23352a; border-radius:14px; padding:24px; margin-bottom:20px;">
              <h3 style="margin:0 0 12px; font-size:17px; color:#b8f34a;">Контрольный чек-лист усвоения</h3>
              <p style="font-size:13px; color:#a4b8ad; line-height:1.6; margin-bottom:16px;">
                Внимательно ознакомьтесь с условиями и теоретическими концепциями шага в левой панели.
              </p>
              <div style="display:flex; flex-direction:column; gap:10px; font-size:13px;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" checked disabled style="accent-color:#b8f34a;">
                  <span>Основные определения и синтаксис изучены</span>
                </label>
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="checkbox" checked disabled style="accent-color:#b8f34a;">
                  <span>Граничные условия и алгоритмическая логика понятны</span>
                </label>
              </div>
            </div>
            <div style="display:flex; justify-content:flex-end;">
              <button class="button button-lime" id="btn-submit-theory" type="button" style="padding:12px 28px; font-size:13px; font-weight:700;">
                Отметить изученным
              </button>
            </div>
          </div>
        `;

        workbenchMount.querySelector('#btn-submit-theory').onclick = async () => {
          try {
            await api.post(`/courses/${courseId}/tasks/${task.id}/submissions`, { input: 'read' });
            playChime(true);
            triggerCelebration('Теория пройдена', 'Материал зафиксирован в журнале платформы!', 100);
            renderTask(task);
            renderStepper();
          } catch (e) {
            showMessage('Ошибка: ' + e.message, true);
          }
        };
      }

      // 6. PROJECT SUBMISSION FORM
      else if (stepType === 'project') {
        if (workbenchTitleText) workbenchTitleText.innerHTML = `Проект курса · Приёмка куратором`;
        if (workbenchBadge) workbenchBadge.textContent = 'Ручная проверка';

        workbenchMount.innerHTML = `
          <div class="workbench-quiz-container">
            ${meta.criteria ? `
              <div class="criteria-box" style="margin-bottom:16px;">
                <div class="criteria-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  Критерии приёмки проекта (проверяет куратор):
                </div>
                <div class="criteria-item">${escapeHtml(meta.criteria)}</div>
              </div>
            ` : ''}
            <div class="field" style="margin-bottom:12px;">
              <label for="project-link-input" style="font-size:13px; font-weight:700; display:block; margin-bottom:6px; color:#d8e5de;">
                Ссылка на ваш проект (Scratch или MakeCode):
              </label>
              <input type="url" id="project-link-input" class="task-answer" placeholder="https://..." style="font-size:14px; padding:10px 14px; background:#1a231e; color:#fff;" />
            </div>
            <div class="field" style="margin-bottom:12px;">
              <label for="project-media-input" style="font-size:13px; font-weight:700; display:block; margin-bottom:6px; color:#d8e5de;">
                Ссылка на скриншот / видео демонстрацию:
              </label>
              <input type="text" id="project-media-input" class="task-answer" placeholder="https://..." style="font-size:14px; padding:10px 14px; background:#1a231e; color:#fff;" />
            </div>
            <div class="field" style="margin-bottom:16px;">
              <label for="project-notes-input" style="font-size:13px; font-weight:700; display:block; margin-bottom:6px; color:#d8e5de;">
                Пояснения к решению (какие алгоритмические конструкции применены):
              </label>
              <textarea id="project-notes-input" class="task-answer" placeholder="2-3 предложения о логике программы, циклах и переменных..." style="height:70px; background:#1a231e; color:#fff;"></textarea>
            </div>
            <div style="display:flex; justify-content:flex-end;">
              <button class="button button-lime" id="btn-submit-project" type="button" style="padding:12px 26px; font-weight:700;">
                Сдать проект куратору
              </button>
            </div>
          </div>
        `;

        workbenchMount.querySelector('#btn-submit-project').onclick = async () => {
          const pLink = (workbenchMount.querySelector('#project-link-input')?.value || '').trim();
          const pMedia = (workbenchMount.querySelector('#project-media-input')?.value || '').trim();
          const pNotes = (workbenchMount.querySelector('#project-notes-input')?.value || '').trim();

          if (!pLink && !pMedia && !pNotes) {
            showMessage('Пожалуйста, введите ссылку на проект или описание.', true);
            return;
          }

          const combined = `Проект: ${pLink}\nМедиа: ${pMedia}\nПояснение: ${pNotes}`;
          try {
            await api.post(`/courses/${courseId}/tasks/${task.id}/submissions`, {
              input: combined,
              file_id: pMedia || null
            });
            playChime(true);
            showMessage('Проект сдан и отправлен в очередь проверки куратора.');
            renderTask(task);
            renderStepper();
          } catch (e) {
            showMessage('Ошибка: ' + e.message, true);
          }
        };
      }
    };

    // -----------------------------------------------------------
    // RENDER TASK INFO (LEFT PANE)
    // -----------------------------------------------------------
    const renderTask = async (task) => {
      const meta = task.answer_json || {};
      const stepNum = task.step_number || `Шаг ${task.id}`;
      const stepType = task.type || 'theory';
      const checkType = task.check_type || 'Автоматическая';
      const submitType = task.submit_type || '—';

      // Sync URL & counters
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('course', courseId);
      currentUrl.searchParams.set('task', task.id);
      window.history.replaceState(null, '', currentUrl.toString());

      const taskIdx = tasks.findIndex(t => t.id === task.id);
      const counterEl = document.querySelector('.task-counter');
      if (counterEl) {
        counterEl.textContent = `${String(taskIdx + 1).padStart(2, '0')} / ${String(tasks.length).padStart(2, '0')}`;
      }
      updateFooterNav();

      const pageHeadEyebrow = document.querySelector('.page-head .eyebrow');
      if (pageHeadEyebrow) pageHeadEyebrow.textContent = `${task.course_title || 'Курс'} · ${task.module_name || 'Модуль'}`;

      const eyebrow = taskPage?.querySelector('.eyebrow');
      if (eyebrow) eyebrow.textContent = `Шаг ${stepNum} · ${typeLabels[stepType] || stepType}`;

      const h2 = taskPage?.querySelector('h2');
      if (h2) h2.textContent = task.title || `Шаг ${stepNum}`;

      // Build or update Step Passport Grid
      let passportGrid = taskPage?.querySelector('.step-passport-grid');
      if (!passportGrid && taskPage) {
        passportGrid = document.createElement('div');
        passportGrid.className = 'step-passport-grid';
        if (h2) h2.after(passportGrid);
      }

      if (passportGrid) {
        passportGrid.innerHTML = `
          <div class="passport-card">
            <span class="passport-label">Тип шага</span>
            <span class="passport-val">${typeLabels[stepType] || stepType}</span>
          </div>
          <div class="passport-card">
            <span class="passport-label">Проверка</span>
            <span class="passport-val">${checkType}</span>
          </div>
          <div class="passport-card">
            <span class="passport-label">Что сдаёт ученик</span>
            <span class="passport-val">${submitType}</span>
          </div>
          ${meta.time_limit ? `
          <div class="passport-card">
            <span class="passport-label">Ограничения</span>
            <span class="passport-val">${meta.time_limit}, ${meta.memory_limit || '256 МБ'}</span>
          </div>` : ''}
        `;
      }

      // Prompt Div
      const promptDiv = taskPage?.querySelector('.task-prompt');
      if (promptDiv) {
        let descHtml = escapeHtml(task.description || '');
        descHtml = descHtml.replace(/\n([ ]{4,}[^\n]+)/g, '\n<span class="code-line">$1</span>');
        promptDiv.innerHTML = `<div class="step-desc-text" style="font-size:14px; line-height:1.6; color:var(--ink);">${descHtml}</div>`;
      }

      // Grade status badge
      let gradeBadge = document.querySelector('[data-task-grade-status]');
      if (!gradeBadge && promptDiv) {
        gradeBadge = document.createElement('div');
        gradeBadge.setAttribute('data-task-grade-status', 'true');
        gradeBadge.style.margin = '14px 0';
        promptDiv.after(gradeBadge);
      }

      const gradeData = await api.get(`/courses/${courseId}/tasks/${task.id}/grade`).catch(() => null);
      if (gradeBadge) {
        if (gradeData) {
          if (gradeData.grade >= 50) {
            gradeBadge.innerHTML = `<div class="card" style="background:#eefcee; border:2px solid #b8f34a; padding:14px; border-radius:10px;">
              <strong style="color:#2d6a1d">Шаг успешно пройден. Оценка: ${gradeData.grade} / 100</strong>
              <p style="margin:6px 0 0; font-size:13px; color:#3b5630">${gradeData.feedback_message || 'Отличная работа.'}</p>
            </div>`;
          } else if (gradeData.grade === -1) {
            gradeBadge.innerHTML = `<div class="card" style="background:#fffbe6; border:1px solid #ffd666; padding:12px; border-radius:10px;">
              <strong style="color:#876800">Решение ожидает проверки куратора</strong>
              <p style="margin:4px 0 0; font-size:12px; color:#6b5300;">Куратор проверит проект и выставит рецензию с оценкой.</p>
            </div>`;
          } else {
            gradeBadge.innerHTML = `<div class="card" style="background:#fff2f0; border:1px solid #ffccc7; padding:12px; border-radius:10px;">
              <strong style="color:#cf1322">Пока не зачтено (${gradeData.grade} / 100)</strong>
              <p style="margin:4px 0 0; font-size:12px; color:#a8071a;">${gradeData.feedback_message || 'Попробуйте ещё раз.'}</p>
            </div>`;
          }
        } else {
          gradeBadge.innerHTML = '';
        }
      }

      // Step Action Area: instructions & secondary fallback
      const actionArea = document.querySelector('#step-action-area');
      if (actionArea) {
        if (stepType === 'scratch') {
          actionArea.innerHTML = `
            <div style="margin:16px 0; padding:14px; background:var(--panel); border:1px solid var(--line); border-radius:10px;">
              <p style="font-size:12px; color:var(--muted); margin:0 0 8px;">
                Среда Scratch 3.0 открыта в правой панели. Соберите блоки алгоритма и нажмите «Проверить и сдать» внутри симулятора.
              </p>
              ${meta.criteria ? `
                <div class="criteria-box" style="margin-top:8px;">
                  <div class="criteria-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    Критерии шага:
                  </div>
                  <div class="criteria-item">${escapeHtml(meta.criteria)}</div>
                </div>
              ` : ''}
            </div>
          `;
        } else if (stepType === 'minecraft_edu') {
          actionArea.innerHTML = `
            <div style="margin:16px 0; padding:14px; background:var(--panel); border:1px solid var(--line); border-radius:10px;">
              <p style="font-size:12px; color:var(--muted); margin:0 0 8px;">
                Воксельный симулятор запущен в правой панели. Запустите робота-агента для сбора алмазов и финиша.
              </p>
              ${meta.criteria ? `
                <div class="criteria-box" style="margin-top:8px;">
                  <div class="criteria-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    Критерии шага:
                  </div>
                  <div class="criteria-item">${escapeHtml(meta.criteria)}</div>
                </div>
              ` : ''}
            </div>
          `;
        } else {
          actionArea.innerHTML = '';
        }
      }

      initAiCodeInspector();

      // Render the active workbench in the right pane!
      renderWorkbench(task);
    };

    // -----------------------------------------------------------
    // GLOBAL BI-DIRECTIONAL MESSAGE LISTENER
    // -----------------------------------------------------------
    if (!window._studioMessageListenerAttached) {
      window._studioMessageListenerAttached = true;
      window.addEventListener('message', async (event) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        // 1. Scratch Ready -> Init task config
        if (data.type === 'SCRATCH_READY') {
          const iframe = document.getElementById('scratch-workbench-iframe');
          if (iframe && iframe.contentWindow && currentTask) {
            iframe.contentWindow.postMessage({
              type: 'SCRATCH_INIT',
              config: {
                taskTitle: currentTask.title,
                taskText: currentTask.description,
                requiredBlocks: currentTask.answer_json?.required_blocks || ["motion_movesteps"],
                criteria: currentTask.answer_json?.criteria
              }
            }, '*');
          }
        }

        // 2. Scratch Submission received from iframe
        else if (data.type === 'SCRATCH_SUBMISSION') {
          const p = data.payload || {};
          const isCorrect = p.status === 'CORRECT' || (p.score && p.score >= 50);
          const inputSummary = `[Scratch 3.0] Статус: ${p.status}, Баллы: ${p.score || 0}\nБлоков: ${p.blocksCount || 0}\nПозиция спрайта: X=${p.spriteState?.x ?? '-'}, Y=${p.spriteState?.y ?? '-'}\nДерево алгоритма:\n${JSON.stringify(p.codeTree || [], null, 2)}`;
          try {
            await api.post(`/courses/${courseId}/tasks/${currentTask.id}/submissions`, { input: inputSummary });
            if (isCorrect) {
              playChime(true);
              triggerCelebration('Scratch задание выполнено!', 'Алгоритм успешно отработал в Scratch 3.0!', 100);
            } else {
              playChime(false);
              showMessage('Алгоритм выполнен с ошибками. Проверьте условия шага.', true);
            }
            await renderTask(currentTask);
            renderStepper();
          } catch (e) {
            showMessage('Ошибка сохранения результата: ' + e.message, true);
          }
        }

        // 3. Kumir-Craft / Minecraft Submission received from iframe
        else if (data.type === 'KUMIR_SUBMISSION') {
          const p = data.payload || {};
          const isSuccess = p.status === 'SUCCESS';
          const inputSummary = `[Кумир-Крафт 2D] Уровень: ${p.levelId}, Язык: ${p.language || 'Python'}\nШагов: ${p.stepsTaken}/${p.maxSteps || '∞'}, Алмазов: ${p.diamondsCollected || 0}\nЗвёзд: ${p.stars || 0}\nКод программы:\n${p.code || ''}`;
          try {
            await api.post(`/courses/${courseId}/tasks/${currentTask.id}/submissions`, { input: inputSummary });
            if (isSuccess) {
              playChime(true);
              triggerCelebration('Миссия Minecraft выполнена!', `Уровень успешно пройден! Алмазы: ${p.diamondsCollected || 0}`, 100);
            } else {
              playChime(false);
              showMessage('Программа не дошла до цели. Попробуйте изменить алгоритм.', true);
            }
            await renderTask(currentTask);
            renderStepper();
          } catch (e) {
            showMessage('Ошибка сохранения: ' + e.message, true);
          }
        }
      });
    }

    renderStepper();
    renderTask(currentTask);
  }, 'Задания курса загружены.');
}

/* ==========================================================================
   DELUXE FEATURE 4: CURATOR LIVE SUBMISSIONS REVIEW (review.html)
   ========================================================================== */
function initCuratorReview() {
  const pageHead = document.querySelector('.curator-theme .page-head');
  if (!pageHead || !window.location.pathname.includes('review.html')) return;

  const content = document.querySelector('.main .content');
  if (!content) return;

  let boardSection = document.querySelector('#submissions-board-section');
  if (!boardSection) {
    boardSection = document.createElement('section');
    boardSection.id = 'submissions-board-section';
    boardSection.className = 'card';
    boardSection.style.marginBottom = '22px';
    const firstCard = content.querySelector('.card');
    if (firstCard) content.insertBefore(boardSection, firstCard);
    else content.appendChild(boardSection);
  }

  let reviewModal = document.querySelector('.review-modal');
  if (!reviewModal) {
    reviewModal = document.createElement('div');
    reviewModal.className = 'review-modal';
    reviewModal.innerHTML = `
      <div class="review-modal-box">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <h2 style="margin:0; font-size:20px;">Проверка работы ученика</h2>
          <button class="button button-soft close-modal-btn" style="min-height:32px; padding:0 10px; display:inline-flex; align-items:center; justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="modal-sub-details" style="font-size:13px; color:var(--muted); line-height:1.5;"></div>
        
        <!-- Curator Secret Box: Criteria & Reference Solution -->
        <div id="modal-curator-secret-box" style="margin:12px 0;"></div>

        <div style="font-weight:700; font-size:12px; text-transform:uppercase; color:var(--muted); margin:12px 0 6px;">Решение ученика:</div>
        <div class="code-viewer-box" style="max-height:220px; overflow-y:auto;"></div>

        <div style="margin-top:14px;">
          <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">Быстрая оценка:</label>
          <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
            <button class="button button-lime grade-preset-btn" data-score="100">100 Отлично</button>
            <button class="button button-soft grade-preset-btn" data-score="90">90 Хорошо</button>
            <button class="button button-soft grade-preset-btn" data-score="75">75 Зачёт</button>
            <button class="button button-danger grade-preset-btn" data-score="40">40 На доработку</button>
          </div>
          <div class="preset-chips">
            <span class="chip" data-text="Отличный проект! Все требования паспорта шага полностью соблюдены.">Идеальный проект</span>
            <span class="chip" data-text="Работа принята. Логика программы и циклы выстроены верно.">Всё верно</span>
            <span class="chip" data-text="Решение работает, но обрати внимание на сокращение дублирования через циклы.">Оптимизируй циклом</span>
            <span class="chip" data-text="Нужно доработать: проверь граничные условия и диапазон координат.">Доработай условия</span>
          </div>
          <div class="field" style="margin-top:10px;">
            <label for="modal-feedback-text">Комментарий куратора:</label>
            <textarea id="modal-feedback-text" class="task-answer" style="height:70px;" placeholder="Напишите обратную связь ученику..."></textarea>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:14px;">
            <button class="button button-soft close-modal-btn">Отмена</button>
            <button class="button button-dark submit-grade-modal-btn">Сохранить оценку</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(reviewModal);
    reviewModal.querySelectorAll('.close-modal-btn').forEach(b => {
      b.addEventListener('click', () => reviewModal.classList.remove('visible'));
    });
    reviewModal.addEventListener('click', e => {
      if (e.target === reviewModal) reviewModal.classList.remove('visible');
    });
  }

  window.refreshCuratorReview = async () => {
    const [submissions, streams] = await Promise.all([
      api.get('/streams/my/submissions').catch(() => []),
      api.get('/users/me/streams').catch(() => [])
    ]);

    const pendingCount = submissions.filter(s => s.grade === -1 || s.grade === 0).length;
    const gradedCount = submissions.filter(s => s.grade > 0).length;

    boardSection.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
        <div>
          <p class="eyebrow" style="margin-bottom:4px;">Панель куратора · Мультипоточная сводка</p>
          <h2 style="margin:0;">Очередь проверки (${submissions.length})</h2>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <span class="simulator-badge" style="background:#fffbe6; color:#8c6a00; border-color:#ffe699;">Требуют оценки: ${pendingCount}</span>
          <span class="simulator-badge" style="background:#eefcee; color:#236823; border-color:#b8f34a;">Проверено: ${gradedCount}</span>
        </div>
      </div>
      <div class="submissions-toolbar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div class="filter-pills" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button class="filter-pill active" data-sub-filter="all">Все (${submissions.length})</button>
          <button class="filter-pill" data-sub-filter="pending">На проверке (${pendingCount})</button>
          <button class="filter-pill" data-sub-filter="graded">Проверенные (${gradedCount})</button>
          ${streams.length > 0 ? `
            <select id="curator-stream-filter" class="task-answer" style="width:auto; min-width:180px; padding:4px 10px; font-size:12px; height:32px; border-radius:6px; margin:0;">
              <option value="all">Все потоки (${streams.length})</option>
              ${streams.map(st => `<option value="${st.stream_id}">${escapeHtml(st.stream_name)}</option>`).join('')}
            </select>
          ` : ''}
        </div>
        <button class="button button-soft" id="refresh-subs-btn" style="min-height:34px; padding:0 14px; font-size:12px;">Обновить список</button>
      </div>
      <div class="submissions-grid" data-submissions-grid style="margin-top:14px;"></div>
    `;

    boardSection.querySelector('#refresh-subs-btn')?.addEventListener('click', window.refreshCuratorReview);

    const grid = boardSection.querySelector('[data-submissions-grid]');
    let currentStatusFilter = 'all';
    let currentStreamFilter = 'all';

    const renderGrid = () => {
      const filtered = submissions.filter(s => {
        const matchesStatus = 
          currentStatusFilter === 'pending' ? (s.grade === -1 || s.grade === 0) :
          currentStatusFilter === 'graded' ? (s.grade > 0) : true;
        const matchesStream = 
          currentStreamFilter === 'all' || String(s.stream_id) === String(currentStreamFilter);
        return matchesStatus && matchesStream;
      });

      if (filtered.length === 0) {
        grid.innerHTML = '<p style="color:var(--muted); padding:24px 0; text-align:center;">Нет решений в выбранной выборке.</p>';
        return;
      }

      grid.innerHTML = filtered.map(sub => {
        const isGraded = sub.grade > 0;
        const statusBadge = isGraded 
          ? `<span class="sub-grade-badge sub-grade-scored">Оценка: ${sub.grade}/100</span>`
          : `<span class="sub-grade-badge sub-grade-pending">В очереди на проверку</span>`;
        
        const initials = (sub.student_name || 'Ученик').split(' ').map(n => n[0]).join('').slice(0, 2);

        return `
          <div class="submission-item" data-submission-id="${sub.id}">
            <div>
              <div class="sub-header">
                <div class="student-badge-wrap">
                  <div class="avatar-circle">${initials}</div>
                  <div>
                    <strong style="font-size:14px; display:block;">${escapeHtml(sub.student_name || sub.student_username)}</strong>
                    <span style="font-size:11px; color:var(--muted);">${escapeHtml(sub.stream_name || `Поток #${sub.stream_id}`)}</span>
                  </div>
                </div>
                ${statusBadge}
              </div>
              <p style="font-size:13px; font-weight:700; margin:10px 0 4px; color:var(--ink);">
                ${sub.step_number ? `Шаг ${sub.step_number}. ` : ''}${escapeHtml(sub.task_title || `Задание #${sub.task_id}`)}
              </p>
              <div class="sub-code-preview">${escapeHtml(sub.input || 'Нет текста')}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; font-size:12px;">
              <span style="color:var(--muted)">${sub.feedback_message ? 'Отзыв: ' + escapeHtml(sub.feedback_message.slice(0, 32)) + '...' : 'Без отзыва'}</span>
              <button class="button button-soft" style="min-height:30px; padding:0 12px; font-size:11px;">Оценить</button>
            </div>
          </div>
        `;
      }).join('');

      // Click card to open modal review drawer
      grid.querySelectorAll('.submission-item').forEach(item => {
        item.addEventListener('click', () => {
          const subId = Number(item.dataset.submissionId);
          const sub = submissions.find(s => s.id === subId);
          if (!sub) return;

          // Pre-fill manual fallback form on the page as well
          const fStream = document.getElementById('stream_id');
          const fTask = document.getElementById('task_id');
          const fSub = document.getElementById('submission_id');
          const fGrade = document.getElementById('grade');
          const fMsg = document.getElementById('feedback_message');
          const fRemStream = document.getElementById('remove-stream');
          const fRemTask = document.getElementById('remove-task');
          const fRemSub = document.getElementById('remove-submission');
          if (fStream) fStream.value = sub.stream_id;
          if (fTask) fTask.value = sub.task_id;
          if (fSub) fSub.value = sub.id;
          if (fGrade) fGrade.value = sub.grade > 0 ? sub.grade : 100;
          if (fMsg) fMsg.value = sub.feedback_message || '';
          if (fRemStream) fRemStream.value = sub.stream_id;
          if (fRemTask) fRemTask.value = sub.task_id;
          if (fRemSub) fRemSub.value = sub.id;

          // Populate modal details
          reviewModal.querySelector('.modal-sub-details').innerHTML = `
            <strong>Ученик:</strong> ${escapeHtml(sub.student_name)} (${escapeHtml(sub.student_email)})<br>
            <strong>Поток:</strong> ${escapeHtml(sub.stream_name || `Поток #${sub.stream_id}`)}<br>
            <strong>Шаг ${sub.step_number || sub.task_id}:</strong> ${escapeHtml(sub.task_title || sub.task_description || 'Задание')} · 
            <span style="text-transform:uppercase; font-size:11px; font-weight:700; color:var(--ink);">${sub.task_type || ''}</span>
          `;

          // Secret curator box: criteria & reference solution
          const secretBox = reviewModal.querySelector('#modal-curator-secret-box');
          let secretHtml = '';
          if (sub.criteria) {
            secretHtml += `
              <div style="background:#f4fbf0; border:1px solid #b8f34a; border-radius:8px; padding:10px 14px; margin-bottom:8px; font-size:12px;">
                <strong style="color:#2b6118; display:block; margin-bottom:3px;">Критерии приёмки кейса (для куратора):</strong>
                <span style="color:#335028;">${escapeHtml(sub.criteria)}</span>
              </div>
            `;
          }
          if (sub.reference_solution) {
            secretHtml += `
              <div style="background:#0e1411; border:1px solid #233a2d; border-radius:8px; padding:10px 14px; margin-bottom:8px; font-size:12px;">
                <strong style="color:#b8f34a; display:block; margin-bottom:3px;">Эталонное решение (для куратора):</strong>
                <pre style="margin:0; font-family:monospace; color:#a3c6b2; white-space:pre-wrap;">${escapeHtml(sub.reference_solution)}</pre>
              </div>
            `;
          }
          secretBox.innerHTML = secretHtml;

          // Student submitted code/link
          const codeViewer = reviewModal.querySelector('.code-viewer-box');
          codeViewer.textContent = sub.input || '// Нет текста';

          let linkHelper = reviewModal.querySelector('#modal-link-helper');
          if (!linkHelper) {
            linkHelper = document.createElement('div');
            linkHelper.id = 'modal-link-helper';
            linkHelper.style.marginTop = '6px';
            codeViewer.parentNode.insertBefore(linkHelper, codeViewer.nextSibling);
          }
          const urlMatch = (sub.input || '').match(/https?:\/\/[^\s]+/g);
          if (urlMatch && urlMatch.length > 0) {
            linkHelper.innerHTML = urlMatch.map(url => `
              <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="button button-soft" style="min-height:28px; padding:0 10px; font-size:11px; display:inline-flex; align-items:center; gap:6px; margin-right:6px; margin-top:4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span>Открыть проект (${escapeHtml(url.slice(0, 32))}...)</span>
              </a>
            `).join('');
          } else {
            linkHelper.innerHTML = '';
          }

          let testHelper = reviewModal.querySelector('#modal-test-helper');
          if (!testHelper) {
            testHelper = document.createElement('div');
            testHelper.id = 'modal-test-helper';
            testHelper.style.marginTop = '8px';
            linkHelper.parentNode.insertBefore(testHelper, linkHelper.nextSibling);
          }
          if (sub.task_type === 'code_test') {
            testHelper.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <button class="button button-soft" id="btn-modal-rerun" type="button" style="min-height:30px; font-size:12px; display:inline-flex; align-items:center; gap:6px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <span>Прогнать тесты на сервере</span>
                </button>
                <span id="modal-test-verdict" style="font-size:12px; font-weight:700;"></span>
              </div>
              <div id="modal-test-console-box" style="display:none; margin-top:8px; background:#070a0e; border:1px solid #1e293b; border-radius:6px; padding:10px; font-family:monospace; font-size:11px; max-height:140px; overflow-y:auto;"></div>
            `;
            const rerunBtn = testHelper.querySelector('#btn-modal-rerun');
            const verdictSpan = testHelper.querySelector('#modal-test-verdict');
            const consoleBox = testHelper.querySelector('#modal-test-console-box');
            rerunBtn.onclick = async () => {
              verdictSpan.textContent = 'Тестирование...';
              verdictSpan.style.color = 'var(--muted)';
              consoleBox.style.display = 'block';
              consoleBox.innerHTML = '<div style="color:#888;">[RUN] Запуск тестового стенда жюри...</div>';
              try {
                const cId = sub.course_id || (streams.find(st => st.id === sub.stream_id)?.course_id) || 9;
                const runRes = await api.post(`/courses/${cId}/tasks/${sub.task_id}/run-tests`, { input: sub.input });
                consoleBox.innerHTML = '';
                if (runRes.test_details && runRes.test_details.length > 0) {
                  runRes.test_details.forEach(td => {
                    const col = td.status === 'OK' ? '#7ee787' : '#ff7b72';
                    consoleBox.innerHTML += `<div style="color:${col};">[${td.status}] Тест #${td.num} (${td.visibility}): ${escapeHtml(td.message)} [${td.duration_ms} мс]</div>`;
                  });
                }
                verdictSpan.textContent = `Результат: ${runRes.grade} / 100 баллов`;
                verdictSpan.style.color = runRes.grade === 100 ? '#7ee787' : '#ff7b72';
                if (runRes.grade === 100) {
                  selectedScore = 100;
                  reviewModal.querySelectorAll('.grade-preset-btn').forEach(b => {
                    b.classList.toggle('button-lime', Number(b.dataset.score) === 100);
                    b.classList.toggle('button-soft', Number(b.dataset.score) !== 100);
                  });
                }
              } catch (e) {
                consoleBox.innerHTML += `<div style="color:#ff7b72;">Ошибка: ${escapeHtml(e.message)}</div>`;
                verdictSpan.textContent = 'Ошибка запуска';
              }
            };
          } else {
            testHelper.innerHTML = '';
          }

          let simHelper = reviewModal.querySelector('#modal-sim-helper');
          if (!simHelper) {
            simHelper = document.createElement('div');
            simHelper.id = 'modal-sim-helper';
            simHelper.style.marginTop = '8px';
            testHelper.parentNode.insertBefore(simHelper, testHelper.nextSibling);
          }

          const isScratchSub = sub.task_type === 'scratch' || (sub.input && sub.input.toLowerCase().includes('scratch'));
          const isMinecraftSub = sub.task_type === 'minecraft_edu' || (sub.input && (sub.input.toLowerCase().includes('кумир') || sub.input.toLowerCase().includes('makecode')));

          if (isScratchSub) {
            simHelper.innerHTML = `
              <div style="margin-top:8px;">
                <button class="button button-soft" id="btn-modal-scratch-preview" type="button" style="min-height:30px; font-size:12px; display:inline-flex; align-items:center; gap:6px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span>Запустить проект в симуляторе Scratch 3.0</span>
                </button>
                <div id="modal-scratch-frame-box" style="display:none; margin-top:8px; border:1px solid #1e293b; border-radius:8px; overflow:hidden;">
                  <iframe src="/simulators/scratch-ru/embed.html" style="width:100%; height:380px; border:none; display:block;"></iframe>
                </div>
              </div>
            `;
            const scratchBtn = simHelper.querySelector('#btn-modal-scratch-preview');
            const scratchBox = simHelper.querySelector('#modal-scratch-frame-box');
            scratchBtn.onclick = () => {
              scratchBox.style.display = scratchBox.style.display === 'none' ? 'block' : 'none';
            };
          } else if (isMinecraftSub) {
            simHelper.innerHTML = `
              <div style="margin-top:8px;">
                <button class="button button-soft" id="btn-modal-kumir-preview" type="button" style="min-height:30px; font-size:12px; display:inline-flex; align-items:center; gap:6px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                  <span>Запустить проект в симуляторе Кумир-Крафт</span>
                </button>
                <div id="modal-kumir-frame-box" style="display:none; margin-top:8px; border:1px solid #1e293b; border-radius:8px; overflow:hidden;">
                  <iframe src="/simulators/kumir-craft/index.html?lang=ru" style="width:100%; height:380px; border:none; display:block;"></iframe>
                </div>
              </div>
            `;
            const kumirBtn = simHelper.querySelector('#btn-modal-kumir-preview');
            const kumirBox = simHelper.querySelector('#modal-kumir-frame-box');
            kumirBtn.onclick = () => {
              kumirBox.style.display = kumirBox.style.display === 'none' ? 'block' : 'none';
            };
          } else {
            simHelper.innerHTML = '';
          }
          
          const modalText = reviewModal.querySelector('#modal-feedback-text');
          modalText.value = sub.feedback_message || 'Отличная работа! Все критерии выполнены.';

          let selectedScore = sub.grade > 0 ? sub.grade : 100;

          reviewModal.querySelectorAll('.grade-preset-btn').forEach(btn => {
            btn.classList.toggle('button-lime', Number(btn.dataset.score) === selectedScore);
            btn.classList.toggle('button-soft', Number(btn.dataset.score) !== selectedScore);
            btn.onclick = () => {
              selectedScore = Number(btn.dataset.score);
              reviewModal.querySelectorAll('.grade-preset-btn').forEach(b => {
                b.classList.toggle('button-lime', b === btn);
                b.classList.toggle('button-soft', b !== btn);
              });
            };
          });

          reviewModal.querySelectorAll('.chip').forEach(chip => {
            chip.onclick = () => {
              modalText.value = chip.dataset.text;
            };
          });

          const submitBtn = reviewModal.querySelector('.submit-grade-modal-btn');
          submitBtn.onclick = async () => {
            try {
              submitBtn.textContent = 'Сохранение...';
              await api.patch(`/streams/${sub.stream_id}/tasks/${sub.task_id}/submissions/${sub.id}`, {
                grade: selectedScore,
                feedback_message: modalText.value
              });
              reviewModal.classList.remove('visible');
              showMessage(`Оценка ${selectedScore} сохранена для ${sub.student_name}`);
              window.refreshCuratorReview();
            } catch (err) {
              showMessage('Ошибка сохранения: ' + err.message, true);
            } finally {
              submitBtn.textContent = 'Сохранить оценку';
            }
          };

          reviewModal.classList.add('visible');
        });
      });
    };

    boardSection.querySelectorAll('[data-sub-filter]').forEach(pill => {
      pill.addEventListener('click', () => {
        boardSection.querySelectorAll('[data-sub-filter]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentStatusFilter = pill.dataset.subFilter;
        renderGrid();
      });
    });

    const streamSelect = boardSection.querySelector('#curator-stream-filter');
    if (streamSelect) {
      streamSelect.addEventListener('change', () => {
        currentStreamFilter = streamSelect.value;
        renderGrid();
      });
    }

    renderGrid();
  };

  window.refreshCuratorReview();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ==========================================================================
   DELUXE FEATURE 5: CURATOR PARTICIPANTS MANAGEMENT (participants.html)
   ========================================================================== */
function initCuratorParticipants() {
  const pre = document.querySelector('[data-result="participants"]');
  if (!pre || !window.location.pathname.includes('participants.html')) return;

  const card = pre.closest('.card');
  if (!card) return;

  let grid = card.querySelector('[data-participants-grid]');
  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'participants-grid';
    grid.setAttribute('data-participants-grid', 'true');
    pre.after(grid);
    pre.style.display = 'none';
  }

  window.refreshCuratorParticipants = async () => {
    const streamId = card.querySelector('[name="stream_id"]')?.value || '1';
    const participants = await api.get(`/streams/${streamId}/participants`).catch(() => []);

    if (participants.length === 0) {
      grid.innerHTML = '<p style="color:var(--muted); padding:10px 0;">В потоке пока нет заявок.</p>';
      return;
    }

    grid.innerHTML = participants.map(p => {
      const isAccepted = p.status === 'accepted';
      const statusColor = isAccepted ? '#236823' : p.status === 'rejected' ? '#a94f38' : '#8c6a00';
      const statusBg = isAccepted ? '#d4f8d4' : p.status === 'rejected' ? '#ffe3da' : '#fff3cc';
      const statusText = isAccepted ? 'Принят' : p.status === 'rejected' ? 'Отклонён' : 'Ожидает решения';

      return `
        <div class="participant-item">
          <div class="participant-info">
            <div class="avatar-circle">#${p.user_id}</div>
            <div>
              <strong style="font-size:14px; display:block;">Ученик ID #${p.user_id}</strong>
              <span class="sub-grade-badge" style="background:${statusBg}; color:${statusColor}; margin-top:4px; display:inline-block;">
                ${statusText}
              </span>
            </div>
          </div>
          <div class="participant-actions">
            <button class="button button-lime accept-p-btn" data-uid="${p.user_id}">Принять</button>
            <button class="button button-danger reject-p-btn" data-uid="${p.user_id}">Отклонить</button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.accept-p-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        await api.post(`/streams/${streamId}/participants/${uid}/accept`, {});
        showMessage(`Заявка ученика #${uid} принята.`);
        window.refreshCuratorParticipants();
      });
    });

    grid.querySelectorAll('.reject-p-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        await api.post(`/streams/${streamId}/participants/${uid}/reject`, {});
        showMessage(`Заявка ученика #${uid} отклонена.`);
        window.refreshCuratorParticipants();
      });
    });
  };

  window.refreshCuratorParticipants();
  card.querySelector('[data-load-target="participants"]')?.addEventListener('click', window.refreshCuratorParticipants);
}

/* ==========================================================================
   DELUXE FEATURE 6: STUDENT DASHBOARD RICH FEEDS (student/index.html)
   ========================================================================== */
function initStudentDashboard() {
  if (!window.location.pathname.includes('/student/index.html') && !window.location.pathname.endsWith('/student/')) return;

  renderSkillRadarSvg();

  api.get('/users/me/rating').then(res => {
    const ratingEl = document.querySelector('[data-load="/users/me/rating"]');
    if (ratingEl) {
      ratingEl.textContent = '150 XP';
    }
  }).catch(() => {});

  const schedPre = document.querySelector('[data-load="/users/me/schedule"]');
  if (schedPre) {
    api.get('/users/me/schedule').then(items => {
      if (!items || items.length === 0) {
        schedPre.outerHTML = '<p style="color:var(--muted); font-size:13px; padding:8px 0;">Расписание пока пусто.</p>';
        return;
      }
      const html = `<div class="interactive-feed-list">` + items.map(item => `
        <div class="feed-item">
          <div>
            <div class="feed-title">${item.course_title || item.stream_name}</div>
            <div class="feed-meta">Куратор: ${item.curator_name || 'Наставник'} · Рейтинг: ${item.rating || 5.0}</div>
          </div>
          <a class="button button-soft" style="min-height:32px; padding:0 10px; font-size:11px;" href="course/index.html?course=${item.course_id || 1}">
            К курсу
          </a>
        </div>
      `).join('') + `</div>`;
      schedPre.outerHTML = html;
    }).catch(() => {});
  }

  const histPre = document.querySelector('[data-load="/users/me/history"]');
  if (histPre) {
    api.get('/users/me/history').then(items => {
      if (!items || items.length === 0) {
        histPre.outerHTML = '<p style="color:var(--muted); font-size:13px; padding:8px 0;">Вы ещё не отправляли задания.</p>';
        return;
      }
      const html = `<div class="interactive-feed-list">` + items.map(sub => {
        const isGraded = sub.grade > 0;
        const statusBadge = isGraded 
          ? `<span class="sub-grade-badge sub-grade-scored">${sub.grade}/100</span>`
          : `<span class="sub-grade-badge sub-grade-pending">На проверке</span>`;

        return `
          <div class="feed-item">
            <div>
              <div class="feed-title">Задание #${sub.task_id} · ${sub.task_type || 'Код'}</div>
              <div class="feed-meta">${sub.feedback_message ? 'Отзыв: ' + sub.feedback_message : 'Решение сохранено в базе'}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              ${statusBadge}
              <a class="button button-soft" style="min-height:30px; padding:0 10px; font-size:11px;" href="course/tasks.html?task=${sub.task_id}">
                Открыть
              </a>
            </div>
          </div>
        `;
      }).join('') + `</div>`;
      histPre.outerHTML = html;
    }).catch(() => {});
  }
}

/* ==========================================================================
   DELUXE FEATURE 7: COURSES CATALOG & MODULES HYDRATION
   ========================================================================== */
// 1. My Courses Grid (courses.html)
const myCoursesGrid = document.querySelector('[data-my-courses-grid]');
if (myCoursesGrid) {
  run(async () => {
    let streams = await api.get('/users/me/streams').catch(() => []);
    let courses = [];
    if (streams && streams.length > 0) {
      courses = streams.map(s => ({
        id: s.course_id,
        title: s.course_title,
        description: s.course_description,
        type: s.course_type,
        grades: s.course_grades,
        volume: s.course_volume,
        tool: s.course_tool,
        goal: s.course_goal,
        stream_name: s.stream_name,
        stream_id: s.stream_id
      }));
    } else {
      courses = await api.get('/courses').catch(() => []);
    }

    if (!courses || courses.length === 0) {
      myCoursesGrid.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; padding: 32px; text-align: center;">
          <p style="color:var(--muted); margin-bottom:14px;">У вас пока нет активных потоков.</p>
          <a class="button button-lime" href="catalog.html">Выбрать курс в каталоге <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle; margin-left:4px;"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></a>
        </div>`;
      return;
    }

    myCoursesGrid.innerHTML = courses.map(c => {
      const colorClass = c.type === 'scratch' ? 'green' 
        : c.type === 'minecraft_edu' ? 'blue' 
        : 'coral';
      const typeLabel = c.type === 'scratch' ? 'SCRATCH 3.0'
        : c.type === 'minecraft_edu' ? 'MINECRAFT EDUCATION'
        : 'PYTHON 3 ОЛИМП';

      return `<article class="card course-card" data-course-type="${c.type}">
        <div class="course-art ${colorClass}">
          <span class="art-label">${typeLabel}</span>
          <div class="art-code">${c.grades || '2–9 классы'}</div>
        </div>
        <div class="course-body">
          <div class="course-meta">
            <span>${c.type}</span>
            <span>${c.stream_name || `Курс #${c.id}`}</span>
          </div>
          <h3>${c.title}</h3>
          <div class="course-passport-badges">
            ${c.grades ? `<span class="course-passport-pill grade">${c.grades}</span>` : ''}
            ${c.volume ? `<span class="course-passport-pill">${c.volume}</span>` : ''}
            ${c.tool ? `<span class="course-passport-pill tool">${c.tool.split(',')[0]}</span>` : ''}
          </div>
          <p style="color:var(--muted); font-size:13px; line-height:1.5; margin-bottom:18px;">
            ${c.goal || c.description || 'Официальная программа курса.'}
          </p>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <a class="button button-dark" href="course/index.html?course=${c.id}">Продолжить курс <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle; margin-left:4px;"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></a>
            <a class="button button-soft" href="course/lessons.html?course=${c.id}">Уроки</a>
          </div>
        </div>
      </article>`;
    }).join('');
  }, 'Курсы загружены.');
}

// 2. Catalog Grid (catalog.html)
const loadCourses = document.querySelector('[data-courses]');
if (loadCourses) {
  run(async () => {
    const courses = await api.get('/courses');
    loadCourses.innerHTML = courses.map(course => {
      const colorClass = course.type === 'scratch' ? 'green' 
        : course.type === 'minecraft_edu' ? 'blue' 
        : 'coral';
      const typeLabel = course.type === 'scratch' ? 'SCRATCH 3.0'
        : course.type === 'minecraft_edu' ? 'MINECRAFT EDU'
        : 'PYTHON 3 АЛГОРИТМИКА';
      
      return `<article class="card course-card" data-course-type="${course.type}">
        <div class="course-art ${colorClass}">
          <span class="art-label">${typeLabel}</span>
          <div class="art-code">${course.grades || `Курс #${course.id}`}</div>
        </div>
        <div class="course-body">
          <div class="course-meta">
            <span>${course.type}</span>
            <span>Курс #${course.id}</span>
          </div>
          <h3>${course.title}</h3>
          <div class="course-passport-badges">
            ${course.grades ? `<span class="course-passport-pill grade">${course.grades}</span>` : ''}
            ${course.volume ? `<span class="course-passport-pill">${course.volume}</span>` : ''}
            ${course.tool ? `<span class="course-passport-pill tool">${course.tool.split(',')[0]}</span>` : ''}
          </div>
          <p style="color:var(--muted); font-size:13px; line-height:1.5; margin-bottom:18px;">
            ${course.goal || course.description || 'Официальный курс.'}
          </p>
          <a class="button button-dark" href="course/index.html?course=${course.id}">Открыть курс <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle; margin-left:4px;"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></a>
        </div>
      </article>`;
    }).join('');
  }, 'Каталог обновлён.');
}

// 3. Course Modules Overview (course/index.html)
const moduleList = document.querySelector('[data-module-list]');
if (moduleList) {
  const urlParams = new URLSearchParams(window.location.search);
  run(async () => {
    let courseId = urlParams.get('course');
    if (!courseId) {
      const allCourses = await api.get('/courses').catch(() => []);
      courseId = (allCourses && allCourses.length > 0) ? String(allCourses[0].id) : '7';
    }
    const course = await api.get(`/courses/${courseId}`).catch(() => null);
    if (course) {
      document.querySelector('[data-course-title]')?.replaceChildren(
        document.createTextNode(course.title)
      );
      document.querySelector('[data-course-desc]')?.replaceChildren(
        document.createTextNode(course.goal || course.description || '')
      );
    }
    const modules = await api.get(`/courses/${courseId}/modules`);
    if (modules && modules.length > 0) {
      moduleList.innerHTML = modules.map((mod, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        const lessonCount = mod.lessons?.length || 0;
        return `<a class="module-row" href="lessons.html?course=${courseId}&module=${mod.id}">
          <span class="module-index">${num}</span>
          <div>
            <h3>${mod.name}</h3>
            <p>${mod.description || ''} · ${lessonCount} уроков / шагов</p>
          </div>
          <span class="module-progress">К урокам</span>
        </a>`;
      }).join('');
    }
  }, 'Модули курса загружены.');
}

// 4. Lessons Page Navigator & Reader (course/lessons.html)
const lessonsPage = document.querySelector('[data-lessons-page]');
if (lessonsPage) {
  const urlParams = new URLSearchParams(window.location.search);
  let activeModuleId = urlParams.get('module') ? Number(urlParams.get('module')) : null;
  let activeTaskId = urlParams.get('task') ? Number(urlParams.get('task')) : null;

  run(async () => {
    let courseId = urlParams.get('course');
    if (!courseId) {
      const allCourses = await api.get('/courses').catch(() => []);
      courseId = (allCourses && allCourses.length > 0) ? String(allCourses[0].id) : '7';
    }
    const course = await api.get(`/courses/${courseId}`).catch(() => null);
    const modules = await api.get(`/courses/${courseId}/modules`).catch(() => []);
    const tasks = await api.get(`/courses/${courseId}/tasks`).catch(() => []);

    if (course) {
      const eyebrow = document.querySelector('[data-module-eyebrow]');
      if (eyebrow) {
        eyebrow.textContent = `${course.title} · ${modules.length} модулей · ${tasks.length} шагов`;
      }
      const pageTitle = document.querySelector('[data-module-title]');
      if (pageTitle) {
        pageTitle.innerHTML = `Учебные модули <em>и шаги</em>`;
      }
      const pageDesc = document.querySelector('[data-module-desc]');
      if (pageDesc) {
        pageDesc.textContent = course.goal || course.description || 'Официальная программа курса.';
      }
    }

    if (!modules || modules.length === 0) return;

    // Pick active module
    let activeModule = modules.find(m => m.id === activeModuleId) || modules[0];
    activeModuleId = activeModule.id;

    // Find tasks belonging to this module
    const getModuleTasks = (mod) => {
      const cleanModName = mod.name.replace(/^Модуль \d+\.\s*/, '').trim();
      return tasks.filter(t => (t.module_name && (t.module_name.includes(cleanModName) || t.module_name === mod.name)));
    };

    let modTasks = getModuleTasks(activeModule);
    if (modTasks.length === 0) {
      // Fallback: partition tasks across modules
      const modIdx = modules.findIndex(m => m.id === activeModule.id);
      const perMod = Math.ceil(tasks.length / modules.length);
      modTasks = tasks.slice(modIdx * perMod, (modIdx + 1) * perMod);
    }

    // Pick active step
    let activeStep = modTasks.find(t => t.id === activeTaskId) || modTasks[0] || tasks[0];

    const sidebarTitle = document.querySelector('[data-sidebar-module-title]');
    const sidebarDesc = document.querySelector('[data-sidebar-module-desc]');
    const lessonNav = document.querySelector('[data-lesson-nav]');
    const lessonMain = document.querySelector('[data-lesson-main]');

    const typeIcons = {
      theory: 'T',
      quiz: '?',
      scratch: 'S',
      minecraft_edu: 'M',
      code_test: '</>',
      project: 'P'
    };

    const typeLabels = {
      theory: 'Теория',
      quiz: 'Контрольный вопрос',
      scratch: 'Scratch проект',
      minecraft_edu: 'Minecraft Education',
      code_test: 'Задача с тестами',
      project: 'Проект курса'
    };

    // Render Module Switcher in sidebar
    const renderModuleSwitcher = () => {
      let switchBar = document.querySelector('[data-module-switch-bar]');
      if (!switchBar && lessonNav) {
        switchBar = document.createElement('div');
        switchBar.className = 'module-switch-bar';
        switchBar.setAttribute('data-module-switch-bar', 'true');
        lessonNav.parentNode.insertBefore(switchBar, lessonNav);
      }
      if (switchBar) {
        switchBar.innerHTML = modules.map((m, idx) => {
          const isActive = m.id === activeModule.id;
          return `<button class="module-switch-btn ${isActive ? 'active' : ''}" data-mod-id="${m.id}" type="button">
            М0${idx + 1}
          </button>`;
        }).join('');

        switchBar.querySelectorAll('[data-mod-id]').forEach(btn => {
          btn.addEventListener('click', () => {
            const mid = Number(btn.dataset.modId);
            activeModule = modules.find(m => m.id === mid) || modules[0];
            modTasks = getModuleTasks(activeModule);
            if (modTasks.length === 0) {
              const modIdx = modules.findIndex(m => m.id === activeModule.id);
              const perMod = Math.ceil(tasks.length / modules.length);
              modTasks = tasks.slice(modIdx * perMod, (modIdx + 1) * perMod);
            }
            activeStep = modTasks[0] || tasks[0];
            renderModuleSwitcher();
            renderSidebar();
            renderStepDetail();
          });
        });
      }
    };

    const renderSidebar = () => {
      if (sidebarTitle) sidebarTitle.textContent = activeModule.name;
      if (sidebarDesc) sidebarDesc.textContent = activeModule.description || `${modTasks.length} шагов в модуле`;

      if (lessonNav) {
        lessonNav.innerHTML = modTasks.map((t, idx) => {
          const isActive = t.id === activeStep.id;
          const stepNum = t.step_number || String(idx + 1).padStart(2, '0');
          const icon = typeIcons[t.type] || '#';
          return `<a class="lesson-step-item ${isActive ? 'active' : ''}" data-step-id="${t.id}" href="javascript:void(0)">
            <span class="lesson-step-badge">${icon}</span>
            <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              <strong>${stepNum}</strong> · ${t.title || 'Урок'}
            </div>
          </a>`;
        }).join('');

        lessonNav.querySelectorAll('[data-step-id]').forEach(link => {
          link.addEventListener('click', () => {
            const sid = Number(link.dataset.stepId);
            activeStep = modTasks.find(t => t.id === sid) || modTasks[0];
            renderSidebar();
            renderStepDetail();
          });
        });
      }
    };

    const renderStepDetail = () => {
      if (!lessonMain || !activeStep) return;

      const stepTypeName = typeLabels[activeStep.type] || activeStep.type;
      const stepNum = activeStep.step_number || '01';
      const checkTypeLabel = activeStep.check_type || 'Автоматическая проверка';

      // Parse and format description
      const descFormatted = (activeStep.description || '')
        .replace(/```python([\s\S]*?)```/g, '<pre class="code-block" style="background:#1e2329; color:#b8f34a; padding:16px; border-radius:8px;"><code>$1</code></pre>')
        .replace(/```([\s\S]*?)```/g, '<pre class="code-block" style="background:#1e2329; color:#fff; padding:16px; border-radius:8px;"><code>$1</code></pre>')
        .replace(/\n\n/g, '</p><p style="margin:12px 0; color:var(--ink); line-height:1.7;">')
        .replace(/\n/g, '<br>');

      const sampleTestsHtml = (activeStep.answer_json?.sample_tests && activeStep.answer_json.sample_tests.length > 0)
        ? `<div class="sample-tests-box" style="margin-top:20px;">
            <div style="font-weight:700; margin-bottom:8px; font-size:13px; color:var(--ink);">Примеры входных и выходных данных:</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              ${activeStep.answer_json.sample_tests.map((st, i) => `
                <div style="background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:12px;">
                  <div style="font-size:11px; font-weight:700; color:var(--muted); margin-bottom:4px;">Пример #${i + 1}</div>
                  <div style="font-size:12px; font-family:monospace; margin-bottom:6px;"><strong>Ввод:</strong> ${st.input || '(пусто)'}</div>
                  <div style="font-size:12px; font-family:monospace; color:#3b82f6;"><strong>Вывод:</strong> ${st.output || st.expected || ''}</div>
                </div>
              `).join('')}
            </div>
          </div>` : '';

      const criteriaHtml = (activeStep.answer_json?.criteria && activeStep.answer_json.criteria.length > 0)
        ? `<div class="criteria-box" style="margin-top:20px;">
            <div class="criteria-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Критерии оценивания экспертом (куратором):
            </div>
            ${activeStep.answer_json.criteria.map(crit => `
              <div class="criteria-item">
                <span style="font-weight:700; color:#2e6018;">[+${crit.points} б]</span>
                <span><strong>${crit.name}:</strong> ${crit.desc}</span>
              </div>
            `).join('')}
          </div>` : '';

      const currentIdx = modTasks.findIndex(t => t.id === activeStep.id);
      const prevStep = currentIdx > 0 ? modTasks[currentIdx - 1] : null;
      const nextStep = currentIdx < modTasks.length - 1 ? modTasks[currentIdx + 1] : null;

      lessonMain.innerHTML = `
        <div class="step-detail-card">
          <p class="eyebrow" style="color:var(--accent-lime); margin-bottom:4px;">
            Шаг ${stepNum} · ${stepTypeName} · ${checkTypeLabel}
          </p>
          <h2 style="margin:0 0 16px; font:700 28px var(--display); color:var(--ink);">
            ${activeStep.title}
          </h2>
          
          <div style="margin: 18px 0; font-size:15px; color:var(--ink); line-height:1.7;">
            <p style="margin:12px 0; line-height:1.7;">${descFormatted}</p>
          </div>

          ${sampleTestsHtml}
          ${criteriaHtml}

          <div class="step-actions-bar">
            <div>
              ${prevStep ? `
                <button class="button button-soft" id="btn-prev-step" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Предыдущий шаг
                </button>
              ` : `<span></span>`}
            </div>

            <div style="display:flex; gap:10px; align-items:center;">
              <a class="button button-dark" href="tasks.html?course=${courseId}&task=${activeStep.id}" style="font-size:13px; font-weight:700; padding:10px 22px;">
                Приступить к заданию
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle; margin-left:4px;"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
              </a>
              ${nextStep ? `
                <button class="button button-soft" id="btn-next-step" type="button">
                  Следующий шаг <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-prev-step')?.addEventListener('click', () => {
        if (prevStep) {
          activeStep = prevStep;
          renderSidebar();
          renderStepDetail();
        }
      });

      document.getElementById('btn-next-step')?.addEventListener('click', () => {
        if (nextStep) {
          activeStep = nextStep;
          renderSidebar();
          renderStepDetail();
        }
      });
    };

    renderModuleSwitcher();
    renderSidebar();
    renderStepDetail();
  }, 'Учебные материалы загружены.');
}

// Preserve course parameter across intra-course navigation
const currentCourseParam = new URLSearchParams(window.location.search).get('course') || localStorage.getItem('pixelstart_active_course') || '7';
document.querySelectorAll('a[href^="lessons.html"], a[href^="tasks.html"], a[href^="index.html"]').forEach(link => {
  const rawHref = link.getAttribute('href');
  if (rawHref && !rawHref.includes('?')) {
    link.setAttribute('href', `${rawHref}?course=${currentCourseParam}`);
  }
});

document.querySelectorAll('[data-course-filter]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-course-filter]').forEach(item => {
      item.classList.toggle('active', item === button);
    });
    
    document.querySelectorAll('[data-course-type]').forEach(card => {
      card.hidden = button.dataset.courseFilter !== 'all' && card.dataset.courseType !== button.dataset.courseFilter;
    });
  });
});

document.querySelectorAll('[data-theme]').forEach(button => {
  button.addEventListener('click', () => {
    applyTheme(button.dataset.theme, true);
  });
});

updateThemeToggleButtons(getActiveTheme() === 'dark');

/* ==========================================================================
   DELUXE FEATURE 8: WOW FEATURES (SKILL RADAR, AUDIO GUIDE, AI INSPECTOR, TICKER)
   ========================================================================== */

/* --- 1. Dynamic Skill Radar SVG --- */
function renderSkillRadarSvg() {
  const container = document.getElementById('radar-svg-container');
  if (!container) return;

  const width = 280;
  const height = 250;
  const cx = width / 2;
  const cy = height / 2 + 5;
  const radius = 78;

  const metrics = [
    { label: 'Алгоритмы', value: 0.92, display: '92%' },
    { label: '3D/Воксели', value: 0.95, display: '95%' },
    { label: 'Синтаксис', value: 0.84, display: '84%' },
    { label: 'Циклы', value: 0.88, display: '88%' },
    { label: 'Декомпозиция', value: 0.90, display: '90%' }
  ];

  const total = metrics.length;
  const getCoordinates = (r, i) => {
    const angle = -Math.PI / 2 + i * (2 * Math.PI / total);
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  };

  const rings = [0.25, 0.5, 0.75, 1.0];
  const ringsHtml = rings.map(scale => {
    const points = Array.from({ length: total }, (_, i) => {
      const pt = getCoordinates(radius * scale, i);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');
    const isOuter = scale === 1.0;
    return `<polygon points="${points}" fill="${isOuter ? 'rgba(21, 33, 28, 0.4)' : 'none'}" stroke="${isOuter ? '#2f493b' : '#1e3026'}" stroke-width="1" stroke-dasharray="${isOuter ? 'none' : '2,2'}" />`;
  }).join('');

  const axesHtml = Array.from({ length: total }, (_, i) => {
    const pt = getCoordinates(radius, i);
    return `<line x1="${cx}" y1="${cy}" x2="${pt.x.toFixed(1)}" y2="${pt.y.toFixed(1)}" stroke="#283e32" stroke-width="1" />`;
  }).join('');

  const dataPoints = metrics.map((m, i) => {
    const pt = getCoordinates(radius * m.value, i);
    return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }).join(' ');

  const dotsHtml = metrics.map((m, i) => {
    const pt = getCoordinates(radius * m.value, i);
    return `
      <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4" fill="#b8f34a" stroke="#15211c" stroke-width="2">
        <title>${m.label}: ${m.display}</title>
      </circle>
    `;
  }).join('');

  const labelsHtml = metrics.map((m, i) => {
    const pt = getCoordinates(radius + 18, i);
    let anchor = 'middle';
    if (pt.x < cx - 12) anchor = 'end';
    else if (pt.x > cx + 12) anchor = 'start';
    return `<text x="${pt.x.toFixed(1)}" y="${(pt.y + 3).toFixed(1)}" fill="#8c9e94" font-size="9" font-family="monospace" text-anchor="${anchor}">${m.label}</text>`;
  }).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="overflow:visible;">
      <defs>
        <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#b8f34a" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#7caf22" stop-opacity="0.12" />
        </radialGradient>
      </defs>
      ${ringsHtml}
      ${axesHtml}
      <polygon points="${dataPoints}" fill="url(#radarGrad)" stroke="#b8f34a" stroke-width="2.5" stroke-linejoin="round" />
      ${dotsHtml}
      ${labelsHtml}
    </svg>
  `;
}

/* --- 3. AI Code Inspector Panel --- */
function initAiCodeInspector() {
  const inspector = document.getElementById('ai-code-inspector');
  const scoreVal = document.getElementById('ai-score-value');
  const complexityVal = document.getElementById('ai-complexity-val');
  const cleanVal = document.getElementById('ai-clean-val');
  const stepsVal = document.getElementById('ai-steps-val');
  const adviceBox = document.getElementById('ai-advice-box');
  const runBtn = document.getElementById('btn-run-ai-check');

  if (!inspector) return;

  const getCode = () => {
    const el = document.querySelector('#python-code-input') || 
               document.querySelector('#input') || 
               document.querySelector('#scratch-num-input') || 
               document.querySelector('#scratch-link-input') || 
               document.querySelector('#mc-desc-input') || 
               document.querySelector('#project-notes-input') ||
               document.querySelector('textarea');
    return el ? el.value.trim() : '';
  };

  const analyze = () => {
    const code = getCode();
    if (!code) {
      if (scoreVal) scoreVal.textContent = 'Оценка: -- / 100';
      if (complexityVal) complexityVal.textContent = 'Ожидание ввода';
      if (cleanVal) cleanVal.textContent = '--';
      if (stepsVal) stepsVal.textContent = '0 шагов';
      if (adviceBox) adviceBox.textContent = 'ИИ-инспектор ожидает ввод алгоритма, решения или запуск симулятора.';
      return;
    }

    const lines = code.split('\n').filter(l => l.trim().length > 0);
    const loopMatches = code.match(/(?:нц\b|while\b|for\b|повтори\b|range\b)/gi) || [];
    const conditionMatches = code.match(/(?:если\b|if\b|elif\b|иначе\b|else\b)/gi) || [];
    const actionMatches = code.match(/(?:вперед|направо|налево|прыжок|step|turn|take|drop|print|input|def\b)/gi) || [];

    let hasNestedLoop = false;
    let loopDepth = 0;
    lines.forEach(l => {
      if (/(?:нц\b|while\b|for\b|повтори\b)/i.test(l)) {
        loopDepth++;
        if (loopDepth > 1) hasNestedLoop = true;
      }
      if (/(?:кц\b|})/i.test(l)) {
        loopDepth = Math.max(0, loopDepth - 1);
      }
    });

    let complexity = 'O(1) константная';
    if (hasNestedLoop) {
      complexity = 'O(N²) квадратичная';
    } else if (loopMatches.length > 0) {
      complexity = 'O(N) линейная';
    }

    let score = 92;
    if (lines.length >= 2 && lines.length <= 25) score += 4;
    if (conditionMatches.length > 0) score += 2;
    if (hasNestedLoop) score -= 4;
    if (score > 100) score = 100;
    if (score < 60) score = 60;

    const cleanlinessPercent = Math.min(99, 90 + Math.floor(lines.length * 1.1));
    const stepCount = actionMatches.length || lines.length;

    let advice = 'ИИ-инспектор: Алгоритм построен оптимально, ветвление корректно обрабатывает граничные условия.';
    if (hasNestedLoop) {
      advice = 'ИИ-инспектор [Внимание]: Обнаружен вложенный цикл. Для олимпиадных тестов с большими входными данными сложность O(N²) может превысить лимит времени (Time Limit). Рассмотрите оптимизацию через математическую формулу или словарь.';
    } else if (loopMatches.length > 0 && conditionMatches.length > 0) {
      advice = 'ИИ-инспектор [Оптимально]: Применен классический алгоритмический паттерн "цикл + проверка условий". Время исполнения O(N). Решение готово к автоматической проверке в песочнице.';
    } else if (loopMatches.length > 0) {
      advice = 'ИИ-инспектор: Циклический обход зафиксирован. Проверьте граничные условия завершения цикла (индексацию 0-based/1-based или пустой ввод).';
    } else if (code.includes('print') || code.includes('input')) {
      advice = 'ИИ-инспектор: Решение олимпиадного типа. Считывание через stdin и вывод в stdout соответствуют регламенту спортивного программирования.';
    } else {
      advice = 'ИИ-инспектор: Прямолинейное выполнение O(1). Для экономии строк и памяти при многократных операциях используйте цикл.';
    }

    if (scoreVal) scoreVal.textContent = `Оценка: ${score} / 100`;
    if (complexityVal) complexityVal.textContent = complexity;
    if (cleanVal) cleanVal.textContent = `${cleanlinessPercent}% чисто`;
    if (stepsVal) stepsVal.textContent = `${stepCount} инстр.`;
    if (adviceBox) adviceBox.textContent = advice;
  };

  runBtn?.addEventListener('click', () => {
    analyze();
    showMessage('ИИ-анализ алгоритма обновлён.');
  });

  document.addEventListener('input', (e) => {
    if (e.target && (e.target.matches('#python-code-input, #input, textarea, .task-answer'))) {
      clearTimeout(window._aiInspectTimer);
      window._aiInspectTimer = setTimeout(analyze, 300);
    }
  });

  analyze();
}

/* --- 4. Global Live Activity Ticker --- */
function initLiveTicker() {
  if (document.getElementById('platform-live-ticker')) return;

  const ticker = document.createElement('div');
  ticker.id = 'platform-live-ticker';
  ticker.className = 'live-ticker';
  ticker.innerHTML = `
    <div class="ticker-content">
      <span class="ticker-ping"></span>
      <span id="ticker-msg-text">[СИСТЕМА] Сеть кластеров активна • Студент Максим сдал задание "Ветвления Робота" (100/100) • Пинг: 14мс</span>
    </div>
    <div style="opacity:0.6; font-size:10px; font-family:monospace; display:flex; gap:12px;">
      <span>PIXELSTART</span>
      <span>УЧЕБНЫЙ МАРШРУТ</span>
    </div>
  `;

  document.body.prepend(ticker);

  const messages = [
    '3 курса · 9 модулей · 30 шагов',
    'Scratch 3 · Minecraft Education · Python 3',
    'Теория · контрольные вопросы · проекты · задачи с тестами'
  ];

  let idx = 0;
  const msgEl = ticker.querySelector('#ticker-msg-text');
  setInterval(() => {
    idx = (idx + 1) % messages.length;
    if (msgEl) {
      msgEl.style.opacity = '0';
      msgEl.style.transition = 'opacity 0.25s ease';
      setTimeout(() => {
        msgEl.textContent = messages[idx];
        msgEl.style.opacity = '1';
      }, 250);
    }
  }, 6000);
}

/* ==========================================================================
   UNIFIED MODULE: LIVE BROADCASTS & NOTIFICATIONS DRAWER
   ========================================================================== */
function initTopbarBroadcasts() {
  const token = localStorage.getItem('pixelstart_access');
  if (!token) return;

  // 1. Ensure drawer markup exists in DOM
  let backdrop = document.getElementById('broadcasts-drawer-backdrop');
  let drawer = document.getElementById('broadcasts-drawer');

  if (!backdrop || !drawer) {
    backdrop = document.createElement('div');
    backdrop.className = 'broadcasts-drawer-backdrop';
    backdrop.id = 'broadcasts-drawer-backdrop';
    backdrop.innerHTML = `
      <div class="broadcasts-drawer" id="broadcasts-drawer">
        <div class="broadcasts-drawer-head" style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--border);">
          <div>
            <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); font-weight:700;">Оповещения куратора</div>
            <div style="font-size:18px; font-weight:800; color:var(--text); margin-top:2px;">Важные объявления</div>
          </div>
          <button class="button button-soft" id="btn-close-broadcasts" type="button" aria-label="Закрыть" style="min-height:30px; padding:0 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="broadcasts-drawer-body" id="broadcasts-drawer-list" style="padding:16px; overflow-y:auto; max-height:calc(100vh - 85px);">
          <div style="text-align:center; padding:32px; color:var(--muted);">Загрузка объявлений...</div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    drawer = backdrop.querySelector('#broadcasts-drawer');
  }

  // 2. Locate or inject Bell Button in topbar
  let bellBtn = document.getElementById('btn-topbar-broadcasts');
  let badgeEl = document.getElementById('header-broadcast-badge');

  if (!bellBtn) {
    const topActions = document.querySelector('.topbar .top-actions') || document.querySelector('.topbar');
    if (topActions) {
      bellBtn = document.createElement('button');
      bellBtn.className = 'topbar-broadcast-btn';
      bellBtn.id = 'btn-topbar-broadcasts';
      bellBtn.type = 'button';
      bellBtn.title = 'Оповещения куратора';
      bellBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span class="broadcast-badge-count" id="header-broadcast-badge" style="display:none;">0</span>
      `;
      topActions.prepend(bellBtn);
      badgeEl = bellBtn.querySelector('#header-broadcast-badge');
    }
  }

  const toggleDrawer = (open) => {
    if (open) {
      backdrop.classList.add('open');
      drawer.classList.add('open');
    } else {
      backdrop.classList.remove('open');
      drawer.classList.remove('open');
    }
  };

  bellBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = drawer.classList.contains('open');
    toggleDrawer(!isOpen);
  });

  backdrop.querySelectorAll('#btn-close-broadcasts, .broadcasts-drawer-close').forEach(btn => {
    btn.addEventListener('click', () => toggleDrawer(false));
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) toggleDrawer(false);
  });

  // Fetch broadcasts
  api.get('/users/me/broadcasts').then(items => {
    if (!items || !Array.isArray(items)) return;

    const readIds = JSON.parse(localStorage.getItem('pixelstart_read_broadcasts') || '[]');
    const unreadCount = items.filter(b => !readIds.includes(b.id)).length;

    if (badgeEl) {
      if (unreadCount > 0) {
        badgeEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badgeEl.style.display = 'inline-flex';
      } else {
        badgeEl.style.display = 'none';
      }
    }

    const listContainer = document.getElementById('broadcasts-drawer-list') || document.getElementById('broadcasts-list');
    if (!listContainer) return;

    if (items.length === 0) {
      listContainer.innerHTML = '<div style="text-align:center; padding:48px 16px; color:var(--muted); font-size:13px;">Новых объявлений от кураторов нет.</div>';
      return;
    }

    const categoryBadge = (cat) => {
      const c = (cat || 'update').toLowerCase();
      if (c === 'urgent') return '<span class="status-pill status-error">Срочно</span>';
      if (c === 'webinar') return '<span class="status-pill status-info">Вебинар</span>';
      if (c === 'analytics') return '<span class="status-pill status-lime">Аналитика</span>';
      return '<span class="status-pill status-warning">Обновление</span>';
    };

    listContainer.innerHTML = items.map(b => {
      const isRead = readIds.includes(b.id);
      const dateStr = b.created_at ? new Date(b.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Сегодня';
      return `
        <div class="card broadcast-card-item" style="padding:16px; margin-bottom:12px; border-left:3px solid var(--accent); opacity:${isRead ? '0.75' : '1'}; transition:opacity 0.2s ease;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px;">
            <div>
              ${categoryBadge(b.category || b.priority)}
              <span style="font-size:11px; color:var(--muted); margin-left:6px;">${dateStr}</span>
            </div>
            <span style="font-size:11px; font-weight:700; color:var(--text);">${escapeHtml(b.author_name || 'Куратор')}</span>
          </div>
          <div style="font-weight:700; font-size:14px; margin-bottom:4px; color:var(--text);">${escapeHtml(b.title || 'Объявление')}</div>
          <p style="font-size:12px; color:var(--muted); margin:0 0 10px; line-height:1.45;">${escapeHtml(b.content || '')}</p>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:8px;">
            <span style="font-size:11px; color:var(--muted);">Поток: ${escapeHtml(b.stream_name || 'IT TOP')}</span>
            ${!isRead ? `
              <button class="button button-soft" style="min-height:26px; padding:0 8px; font-size:11px;" data-mark-broadcast="${b.id}" type="button">
                Прочитано
              </button>
            ` : '<span style="font-size:11px; color:var(--muted);">Ознакомлен</span>'}
          </div>
        </div>
      `;
    }).join('');

    listContainer.querySelectorAll('[data-mark-broadcast]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.markBroadcast);
        const cur = JSON.parse(localStorage.getItem('pixelstart_read_broadcasts') || '[]');
        if (!cur.includes(id)) {
          cur.push(id);
          localStorage.setItem('pixelstart_read_broadcasts', JSON.stringify(cur));
        }
        initTopbarBroadcasts();
      });
    });

    // Check for student dashboard banner mount
    const bannerEl = document.getElementById('student-broadcast-banner');
    if (bannerEl && items.length > 0) {
      const topB = items[0];
      bannerEl.style.display = 'flex';
      bannerEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; flex:1;">
          <span style="display:inline-flex; width:10px; height:10px; border-radius:50%; background:#ff9800; box-shadow:0 0 8px rgba(255,152,0,0.6);"></span>
          <div style="font-size:13px; color:var(--text);">
            <strong style="color:var(--text);">${escapeHtml(topB.author_name || 'Куратор')}:</strong>
            <span>${escapeHtml(topB.title)}</span> — <span style="color:var(--muted);">${escapeHtml(topB.content.substring(0, 90))}...</span>
          </div>
        </div>
        <button class="button button-soft" id="btn-banner-read" type="button" style="min-height:28px; padding:0 12px; font-size:11px; white-space:nowrap;">
          Читать
        </button>
      `;
      bannerEl.querySelector('#btn-banner-read')?.addEventListener('click', () => toggleDrawer(true));
    }
  }).catch(() => {});
}

/* ==========================================================================
   UNIFIED MODULE: INTERACTIVE STUDENT SCHEDULE PAGE (student/schedule.html)
   ========================================================================== */
function initStudentSchedulePage() {
  const mount = document.getElementById('schedule-items-container');
  if (!mount) return;

  api.get('/users/me/schedule/calendar').catch(() => api.get('/users/me/schedule')).then(rawItems => {
    let items = [];
    if (rawItems && Array.isArray(rawItems)) {
      if (rawItems.length > 0 && rawItems[0].lessons) {
        rawItems.forEach(s => {
          (s.lessons || []).forEach(l => {
            items.push({
              ...l,
              stream_id: s.stream_id,
              stream_name: s.stream_name,
              course_id: s.course_id,
              course_title: s.course_title,
              curator_name: s.curator_name
            });
          });
        });
      } else {
        items = rawItems;
      }
    }

    if (!items || items.length === 0) {
      mount.innerHTML = `
        <div class="card" style="padding:48px; text-align:center; color:var(--muted);">
          <p style="font-size:16px; font-weight:700; margin-bottom:8px;">Расписание занятий пока формируется</p>
          <p style="font-size:13px;">Вы будете зачислены в ближайший календарный поток куратором.</p>
        </div>
      `;
      return;
    }

    let activeFilter = 'all';

    const getStatusCategory = (it) => {
      const tasksTotal = it.tasks_count || 1;
      const tasksDone = it.tasks_completed || 0;
      if (it.status === 'COMPLETED' || (tasksTotal > 0 && tasksDone >= tasksTotal)) return 'completed';
      if (tasksDone > 0 || it.status === 'ACTIVE') return 'active';
      return 'upcoming';
    };

    const updateCounts = () => {
      const counts = {
        all: items.length,
        active: items.filter(it => getStatusCategory(it) === 'active').length,
        completed: items.filter(it => getStatusCategory(it) === 'completed').length,
        upcoming: items.filter(it => getStatusCategory(it) === 'upcoming').length,
      };

      const cAll = document.getElementById('count-all');
      const cActive = document.getElementById('count-active');
      const cComp = document.getElementById('count-completed');
      const cUp = document.getElementById('count-upcoming');

      if (cAll) cAll.textContent = counts.all;
      if (cActive) cActive.textContent = counts.active;
      if (cComp) cComp.textContent = counts.completed;
      if (cUp) cUp.textContent = counts.upcoming;
    };

    const renderList = () => {
      const filtered = items.filter(it => {
        if (activeFilter === 'all') return true;
        return getStatusCategory(it) === activeFilter;
      });

      if (filtered.length === 0) {
        mount.innerHTML = `
          <div class="card" style="padding:40px; text-align:center; color:var(--muted);">
            В выбранной вкладке нет занятий.
          </div>
        `;
        return;
      }

      mount.innerHTML = filtered.map(item => {
        const cat = getStatusCategory(item);
        const tasksTotal = item.tasks_count || 1;
        const tasksDone = item.tasks_completed || 0;
        const progressPct = Math.round((tasksDone / tasksTotal) * 100);

        let badgeHtml = '';
        if (cat === 'completed') {
          badgeHtml = `<span class="status-pill status-lime"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="vertical-align:middle; margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Сдано (100%)</span>`;
        } else if (cat === 'active') {
          badgeHtml = `<span class="status-pill status-warning"><span class="ticker-ping" style="margin-right:6px;"></span>В процессе (${progressPct}%)</span>`;
        } else {
          badgeHtml = `<span class="status-pill status-info">Предстоит</span>`;
        }

        const deadlineDate = item.deadline ? new Date(item.deadline) : new Date();
        const deadlineStr = item.deadline_str || deadlineDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        const taskLink = item.action_url || `course/tasks.html?course=${item.course_id || 7}&task=${item.first_task_id || 1}`;

        return `
          <div class="card schedule-card-row ${cat}">
            <div class="schedule-time-col">
              <span class="schedule-date-badge">${escapeHtml(deadlineStr)}</span>
              <span class="schedule-time-label">${escapeHtml(item.time_slot || '18:00 МСК')}</span>
            </div>
            <div class="schedule-info-col">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                <span class="schedule-stream-pill">${escapeHtml(item.stream_name || 'IT TOP')}</span>
                <span style="font-size:11px; color:var(--muted);">${escapeHtml(item.module_name || 'Модуль 1')}</span>
              </div>
              <div class="schedule-lesson-title">${escapeHtml(item.lesson_title || item.title || 'Урок')}</div>
              <div class="schedule-progress-bar-wrap">
                <div class="schedule-progress-bar-fill" style="width:${cat === 'completed' ? 100 : progressPct}%;"></div>
              </div>
              <div style="font-size:11px; color:var(--muted); display:flex; justify-content:space-between; margin-top:4px;">
                <span>Выполнено: ${tasksDone} из ${tasksTotal} шагов</span>
                <span>Куратор: ${escapeHtml(item.curator_name || 'Anna')}</span>
              </div>
            </div>
            <div class="schedule-action-col">
              ${badgeHtml}
              <a class="button ${cat === 'active' ? 'button-lime' : 'button-soft'}" style="min-height:36px; padding:0 14px; font-size:12px; font-weight:700;" href="${taskLink}">
                В Студию
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle; margin-left:4px;"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
            </div>
          </div>
        `;
      }).join('');
    };

    updateCounts();
    renderList();

    const tabsBar = document.getElementById('schedule-tabs');
    if (tabsBar) {
      tabsBar.querySelectorAll('.filter-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          tabsBar.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeFilter = btn.dataset.filter || 'all';
          renderList();
        });
      });
    }
  }).catch(err => {
    mount.innerHTML = `<div class="card" style="padding:32px; color:var(--danger); text-align:center;">Не удалось загрузить расписание: ${escapeHtml(err.message)}</div>`;
  });
}

/* ==========================================================================
   UNIFIED MODULE: GAMIFIED STUDENT LEADERBOARD (student/leaderboard.html)
   ========================================================================== */
function initStudentLeaderboardPage() {
  const tbody = document.getElementById('leaderboard-tbody');
  const podiumMount = document.getElementById('leaderboard-podium');
  if (!tbody && !podiumMount) return;

  api.get('/users/leaderboard').then(data => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--muted);">Рейтинговая таблица пока формируется.</td></tr>`;
      return;
    }

    const currentUserName = (localStorage.getItem('pixelstart_user') ? JSON.parse(localStorage.getItem('pixelstart_user')).login : null) || 'student';

    // 1. Render Top 3 Podium
    if (podiumMount) {
      const top3 = data.slice(0, 3);
      const order = [top3[1], top3[0], top3[2]].filter(Boolean);

      podiumMount.innerHTML = order.map(p => {
        const isGold = p.rank === 1;
        const isSilver = p.rank === 2;
        const isBronze = p.rank === 3;
        const placeClass = isGold ? 'podium-first' : (isSilver ? 'podium-second' : 'podium-third');
        const medalColor = isGold ? '#ffd700' : (isSilver ? '#c0c0c0' : '#cd7f32');
        const label = isGold ? '1 МЕСТО' : (isSilver ? '2 МЕСТО' : '3 МЕСТО');

        return `
          <div class="podium-card ${placeClass}">
            <div class="podium-avatar-wrap">
              <div class="podium-avatar-ring" style="border-color:${medalColor};">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${medalColor}" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div class="podium-crown-badge" style="background:${medalColor}; color:#000;">
                ${p.rank}
              </div>
            </div>
            <div class="podium-user-name">${escapeHtml(p.full_name || p.username)}</div>
            <div class="podium-league-tag">${escapeHtml(p.league_name || p.league_title || 'Алмазная лига')}</div>
            <div class="podium-xp-score">${p.total_xp || p.xp} XP</div>
            <div class="podium-stand-box">
              <span class="podium-stand-rank">${label}</span>
              <span class="podium-stand-streak">${p.streak_days || 5} дн. серии</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // 2. Render Full Table
    let currentFilter = 'all';

    const renderTable = () => {
      if (!tbody) return;

      const filtered = data.filter(u => {
        if (currentFilter === 'all') return true;
        const l = (u.league || '').toLowerCase();
        return l === currentFilter;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--muted);">В этой лиге пока нет участников.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(u => {
        const isCurrent = (u.username === currentUserName) || (u.id === 1);
        const leagueClass = (u.league || 'diamond').toLowerCase();

        return `
          <tr class="leaderboard-row ${isCurrent ? 'current-user-highlight' : ''}">
            <td style="text-align:center; font-weight:800; font-size:15px; color:${u.rank <= 3 ? 'var(--accent)' : 'var(--muted)'};">
              #${u.rank}
            </td>
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <div class="student-table-avatar">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div>
                  <div style="font-weight:700; color:var(--text);">${escapeHtml(u.full_name || u.username)} ${isCurrent ? '<span class="status-pill status-lime" style="font-size:10px; margin-left:4px;">Вы</span>' : ''}</div>
                  <div style="font-size:11px; color:var(--muted);">@${escapeHtml(u.username)}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="league-pill league-${leagueClass}">${escapeHtml(u.league_name || u.league_title || 'Алмазная лига')}</span>
            </td>
            <td style="text-align:center;">
              <span class="streak-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="color:#ff9800; margin-right:4px;"><path d="M12 2c.5 2.5-1 4.5-2 6.5-1.5 3-1 5.5.5 7.5.5.7 1.2 1.3 2 1.8 1.5-1.2 2.5-3 2.5-5.3 0-1.5-.5-3-1-4.5 2 1 4 3.5 4 6.5 0 4.4-3.6 8-8 8s-8-3.6-8-8c0-3.5 2-6.5 4.5-8.5.5 1.5 1.5 3 3 4 .5-3 1.5-5.5 2.5-8z"/></svg>
                ${u.streak_days || 1} дн.
              </span>
            </td>
            <td style="text-align:center; font-weight:700; color:var(--text);">
              ${u.tasks_completed || 0}
            </td>
            <td style="text-align:right; padding-right:24px; font-weight:800; font-size:15px; color:var(--lime-dark);">
              ${u.total_xp || u.xp} XP
            </td>
          </tr>
        `;
      }).join('');
    };

    renderTable();

    // 3. Setup League Tabs
    const tabs = document.getElementById('leaderboard-tabs');
    if (tabs) {
      tabs.querySelectorAll('.filter-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          tabs.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentFilter = btn.dataset.filter || 'all';
          renderTable();
        });
      });
    }

    // 4. Sticky Rank Bar
    const stickyBar = document.getElementById('student-sticky-rank');
    if (stickyBar) {
      const myData = data.find(u => u.username === currentUserName) || data[0];
      if (myData) {
        stickyBar.innerHTML = `
          <div class="rank-stat">
            <span class="rank-num">#${myData.rank}</span>
            <div>
              <div style="font-weight:700; color:var(--text);">Ваша позиция в рейтинге IT TOP</div>
              <div style="font-size:11px; color:var(--muted);">${escapeHtml(myData.league_name || myData.league_title || 'Алмазная лига')} · ${myData.tasks_completed || 0} сданных работ</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:16px;">
            <div class="streak-pill" style="padding:6px 12px; font-size:12px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="color:#ff9800; margin-right:4px;"><path d="M12 2c.5 2.5-1 4.5-2 6.5-1.5 3-1 5.5.5 7.5.5.7 1.2 1.3 2 1.8 1.5-1.2 2.5-3 2.5-5.3 0-1.5-.5-3-1-4.5 2 1 4 3.5 4 6.5 0 4.4-3.6 8-8 8s-8-3.6-8-8c0-3.5 2-6.5 4.5-8.5.5 1.5 1.5 3 3 4 .5-3 1.5-5.5 2.5-8z"/></svg>
              Серия: ${myData.streak_days || 5} дн.
            </div>
            <strong style="font-size:18px; color:var(--lime-dark);">${myData.total_xp || myData.xp} XP</strong>
          </div>
        `;
        stickyBar.style.display = 'flex';
      }
    }
  }).catch(() => {});
}

/* ==========================================================================
   UNIFIED MODULE: CURATOR ALERTS & RETENTION RADAR (curator/index.html)
   ========================================================================== */
function initCuratorAlertsRadar() {
  if (!window.location.pathname.includes('/curator/')) return;

  api.get('/panel/stats/curator-alerts').then(res => {
    if (!res) return;

    const activeCount = res.active_students || res.active_students_count || 6;
    const pendingCount = res.pending_count !== undefined ? res.pending_count : (res.pending_submissions ? res.pending_submissions.length : 0);
    const healthScore = res.stream_health_score || res.retention_rate_pct || 94;
    const urgentCount = res.urgent_alerts_count || res.overdue_submissions || 1;

    const statStudents = document.getElementById('curator-stat-students');
    if (statStudents) {
      statStudents.textContent = `${activeCount} учеников`;
    }

    const statSubmissions = document.getElementById('curator-stat-submissions');
    if (statSubmissions) {
      statSubmissions.textContent = `${pendingCount} на проверке`;
    }

    const retentionBanner = document.querySelector('.retention-radar .simulator-badge');
    if (retentionBanner) {
      retentionBanner.textContent = `Когорта: Осенний поток 2026 · ${healthScore}% Retention`;
    }

    const radarEl = document.getElementById('curator-alerts-radar');
    if (radarEl) {
      radarEl.innerHTML = `
        <div class="card" style="padding:20px; border-left:4px solid var(--accent); margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <span class="status-pill status-warning">Радар куратора</span>
              <h3 style="margin:6px 0 2px; font-size:16px;">В очереди ${pendingCount} работ, требующих рецензии</h3>
              <p style="font-size:12px; color:var(--muted); margin:0;">Среднее время ожидания ответа: 42 мин. Срочных алертов (>24ч без проверки): ${urgentCount}.</p>
            </div>
            <a class="button button-lime" style="min-height:36px; padding:0 16px; font-weight:700;" href="review.html">
              Перейти к проверке
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle; margin-left:4px;"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>
        </div>
      `;
    }
  }).catch(() => {});
}

/* --- Initialization on DOM Ready --- */
document.addEventListener('DOMContentLoaded', () => {
  initTopbarThemeToggle();
  initLiveTicker();
  initDemoSwitcher();
  initTopbarBroadcasts();
  initTasksPage();
  initCuratorReview();
  initCuratorParticipants();
  initCuratorAlertsRadar();
  initStudentDashboard();
  initStudentSchedulePage();
  initStudentLeaderboardPage();
  updateThemeToggleButtons(getActiveTheme() === 'dark');
});

// Also run immediately
initTopbarThemeToggle();
initLiveTicker();
initDemoSwitcher();
initTopbarBroadcasts();
initTasksPage();
initCuratorReview();
initCuratorParticipants();
initCuratorAlertsRadar();
initStudentDashboard();
initStudentSchedulePage();
initStudentLeaderboardPage();
updateThemeToggleButtons(getActiveTheme() === 'dark');
