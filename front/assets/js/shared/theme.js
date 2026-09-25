function getActiveTheme() {
  return localStorage.getItem('pixelstart_theme') === 'dark' ? 'dark' : 'light';
}

function updateThemeToggleButtons(isDark) {
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

  const demoToggle = document.getElementById('global-theme-toggle');

  if (demoToggle) {
    demoToggle.textContent = isDark ? 'Светлая тема' : 'Тёмная тема';
  }

  document.querySelectorAll('button[data-theme]').forEach(btn => {
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

document.querySelectorAll('button[data-theme]').forEach(button => {
  button.addEventListener('click', () => {
    applyTheme(button.dataset.theme, true);
  });
});

updateThemeToggleButtons(getActiveTheme() === 'dark');

document.addEventListener('DOMContentLoaded', () => {
  // The stylesheet styles dark mode via body.dark-theme, which is only reachable after parsing.
  applyTheme(getActiveTheme(), false);
  initTopbarThemeToggle();
});
