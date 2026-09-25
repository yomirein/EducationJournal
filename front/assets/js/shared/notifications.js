// Curator broadcasts come from GET /users/me/broadcasts (newest first). "Read" is
// remembered in this browser (localStorage).
const READ_KEY = 'pixelstart_read_broadcasts';
const TOASTED_KEY = 'pixelstart_toasted_broadcast';

const readBroadcastIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

const markBroadcastsRead = ids => {
  const read = readBroadcastIds();

  ids.forEach(id => read.add(Number(id)));
  localStorage.setItem(READ_KEY, JSON.stringify([...read]));
};

const byNewest = items => [...items].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

const notificationCategory = {
  urgent: ['Срочно', 'status-failed'],
  webinar: ['Вебинар', 'status-progress'],
  analytics: ['Аналитика', 'status-done'],
  update: ['Обновление', 'status-review']
};

const notificationDate = value => value
  ? new Date(value).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '';

// Where "Все уведомления" leads: curators manage their broadcasts, others read the feed.
const notificationsPageUrl = role => (role === 'curator' ? '/curator/broadcast.html' : '/student/notifications.html');

function notificationCard(item, read, { compact = false } = {}) {
  const [label, css] = notificationCategory[item.category] || notificationCategory.update;

  return `<article class="notif-item ${read ? 'is-read' : ''}" data-notification="${Number(item.id)}">
    <div class="notif-item-head">
      <span class="status ${css}">${label}</span>
      <span class="notif-date">${escapeHtml(notificationDate(item.timestamp))}</span>
    </div>
    <strong class="notif-title">${escapeHtml(item.title || 'Объявление')}</strong>
    ${compact ? '' : `<p class="notif-text">${escapeHtml(item.text)}</p>`}
    <div class="notif-meta">
      <span>${escapeHtml(item.author_name || 'Куратор')} · ${escapeHtml(item.stream_name || '')}</span>
      ${read ? '<span>Прочитано</span>' : `<button class="button button-soft button-sm" type="button" data-mark-read="${Number(item.id)}">Прочитано</button>`}
    </div>
  </article>`;
}

function initNotifications() {
  if (!api.auth.access) return;

  const topbar = document.querySelector('.topbar');

  if (!topbar) return;

  let actions = topbar.querySelector('.top-actions');

  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'top-actions';
    topbar.appendChild(actions);
  }

  let bell = document.getElementById('btn-topbar-broadcasts');

  if (!bell) {
    bell = document.createElement('button');
    bell.className = 'topbar-broadcast-btn';
    bell.id = 'btn-topbar-broadcasts';
    bell.type = 'button';
    bell.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="broadcast-badge-count" id="header-broadcast-badge" hidden>0</span>`;
    actions.prepend(bell);
  }

  bell.title = 'Уведомления';
  bell.setAttribute('aria-haspopup', 'true');
  bell.setAttribute('aria-expanded', 'false');

  const badge = document.getElementById('header-broadcast-badge');

  const wrap = document.createElement('div');
  wrap.className = 'notif-anchor';
  bell.replaceWith(wrap);
  wrap.append(bell);

  const panel = document.createElement('div');
  panel.className = 'notif-dropdown';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Последние уведомления');
  wrap.append(panel);

  let items = [];

  const toggle = open => {
    panel.hidden = !open;
    bell.setAttribute('aria-expanded', String(open));
  };

  const render = async () => {
    const [list, user] = await Promise.all([api.get('/users/me/broadcasts'), getCurrentUser()]);

    items = byNewest(list);

    const read = readBroadcastIds();
    const unread = items.filter(item => !read.has(item.id));

    if (badge) {
      badge.hidden = !unread.length;
      badge.style.display = unread.length ? 'inline-flex' : 'none';
      badge.textContent = unread.length > 9 ? '9+' : String(unread.length);
    }

    panel.innerHTML = `
      <div class="notif-dropdown-head">
        <strong>Уведомления</strong>
        ${unread.length ? `<button class="notif-link" type="button" data-mark-all>Прочитать все</button>` : ''}
      </div>
      <div class="notif-dropdown-list">
        ${items.length ? items.slice(0, 3).map(item => notificationCard(item, read.has(item.id), { compact: true })).join('')
          : '<p class="notif-empty">Новых объявлений нет.</p>'}
      </div>
      <a class="button button-dark notif-all" href="${notificationsPageUrl(user.role)}">Все уведомления</a>`;

    // Toast once for every new unread notification, not on each page load.
    const newest = unread[0];

    if (newest && Number(localStorage.getItem(TOASTED_KEY) || 0) < newest.id) {
      localStorage.setItem(TOASTED_KEY, String(newest.id));

      showMessage(unread.length === 1
        ? 'У вас непрочитанное уведомление от куратора.'
        : `У вас ${unread.length} ${plural(unread.length, 'непрочитанное уведомление', 'непрочитанных уведомления', 'непрочитанных уведомлений')}.`);
    }
  };

  bell.addEventListener('click', event => {
    event.stopPropagation();
    toggle(panel.hidden);
  });

  document.addEventListener('click', event => {
    if (!wrap.contains(event.target)) toggle(false);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') toggle(false);
  });

  panel.addEventListener('click', event => {
    const one = event.target.closest('[data-mark-read]');
    const all = event.target.closest('[data-mark-all]');

    if (!one && !all) return;

    event.stopPropagation();
    markBroadcastsRead(all ? items.map(item => item.id) : [one.dataset.markRead]);
    refreshPageData();
  });

  registerLoader(render);
}

function initNotificationsPage() {
  const mount = document.querySelector('[data-notifications-list]');

  if (!mount) return;

  let filter = 'all';

  registerLoader(async () => {
    const items = byNewest(await api.get('/users/me/broadcasts'));
    const read = readBroadcastIds();
    const unreadCount = items.filter(item => !read.has(item.id)).length;

    document.querySelectorAll('[data-notif-filter]').forEach(button => {
      button.classList.toggle('active', button.dataset.notifFilter === filter);
    });

    const counter = document.querySelector('[data-notif-unread-count]');

    if (counter) counter.textContent = String(unreadCount);

    const visible = filter === 'unread' ? items.filter(item => !read.has(item.id)) : items;

    mount.innerHTML = visible.length
      ? visible.map(item => notificationCard(item, read.has(item.id))).join('')
      : `<div class="empty-state-box">${filter === 'unread' ? 'Все уведомления прочитаны.' : 'Кураторы ещё не публиковали объявлений в ваших потоках.'}</div>`;

    mount.dataset.ids = items.map(item => item.id).join(',');
  });

  document.querySelectorAll('[data-notif-filter]').forEach(button => {
    button.addEventListener('click', () => {
      filter = button.dataset.notifFilter;
      refreshPageData();
    });
  });

  document.querySelector('[data-notif-read-all]')?.addEventListener('click', () => {
    markBroadcastsRead((mount.dataset.ids || '').split(',').filter(Boolean));
    refreshPageData();
  });

  mount.addEventListener('click', event => {
    const one = event.target.closest('[data-mark-read]');

    if (!one) return;

    markBroadcastsRead([one.dataset.markRead]);
    refreshPageData();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNotifications();
  initNotificationsPage();
});
