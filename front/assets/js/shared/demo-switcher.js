function initDemoSwitcher() {
  if (document.querySelector('.demo-switcher')) return;
  if (!isLocalHost) return;

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
          <a class="demo-tray-link" data-demo-course="scratch" href="/student/courses.html" title="Курс 1: Scratch">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>Scratch 3.0</span>
          </a>
          <a class="demo-tray-link" data-demo-course="minecraft" href="/student/courses.html" title="Курс 2: Minecraft Education">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            <span>Minecraft Education</span>
          </a>
          <a class="demo-tray-link" data-demo-course="python" href="/student/courses.html" title="Курс 3: Python 3">
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
          <a class="demo-tray-link" href="/student/course/lessons.html" title="Уроки курса">
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

  getCourses().then(courses => {
    const patterns = { scratch: /scratch/i, minecraft: /minecraft/i, python: /python/i };

    for (const [kind, pattern] of Object.entries(patterns)) {
      const course = courses.find(item => pattern.test(item.title || ''));
      const link = switcher.querySelector(`[data-demo-course="${kind}"]`);

      if (course && link) link.href = `/student/course/tasks.html?course=${course.id}`;
    }
  }).catch(() => {});

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

  switcher.querySelectorAll('[data-role-switch]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const label = btn.textContent;

      btn.textContent = '...';

      try {
        await quickLogin(btn.dataset.roleSwitch);
      } catch (error) {
        showMessage(`Ошибка переключения роли: ${errorText(error)}`, true);
        btn.textContent = label;
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', initDemoSwitcher);
