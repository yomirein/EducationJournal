function initAdminStreamsPage() {
  const mount = document.getElementById('admin-streams-mount');

  if (!mount) return;

  const formatDay = value => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

  registerLoader(async () => {
    const [streams, courses, curators] = await Promise.all([
      api.get('/streams?limit=100'),
      api.get('/courses?limit=100'),
      api.get('/panel/users?role=curator&limit=100')
    ]);

    if (!streams.length) {
      mount.innerHTML = '<div class="empty-state-box">Потоки пока не созданы. Заполните форму выше, чтобы создать первый.</div>';

      return;
    }

    const courseTitle = id => courses.find(course => course.id === id)?.title || `Курс #${id}`;

    const curatorName = id => {
      const curator = curators.find(user => user.id === id);

      return curator ? `${curator.first_name} ${curator.last_name}`.trim() : `Куратор #${id}`;
    };

    const now = Date.now();

    const state = stream => now < new Date(stream.start_date) ? ['Скоро старт', 'unpaid']
      : now > new Date(stream.end_date) ? ['Завершён', 'unpaid'] : ['Идёт обучение', 'paid'];

    mount.innerHTML = `<div class="streams-grid">${streams.map(stream => {
      const [label, css] = state(stream);
      return `<div class="stream-card">
        <div class="stream-card-head">
          <div>
            <h3 class="stream-title">${escapeHtml(stream.name)}</h3>
            <div style="font-size:12px; color:var(--muted); margin-top:2px;">${escapeHtml(courseTitle(stream.course_id))} · ${escapeHtml(curatorName(stream.curator_id))}</div>
          </div>
          <span class="stream-id-badge">ID #${Number(stream.id)}</span>
        </div>
        <div class="stream-meta-list">
          <div class="stream-meta-row"><span>Статус:</span><span class="user-badge-pay ${css}">${label}</span></div>
          <div class="stream-dates">Сроки: <strong>${formatDay(stream.start_date)}</strong> — <strong>${formatDay(stream.end_date)}</strong></div>
        </div>
      </div>`;
    }).join('')}</div>`;
  });
}

document.addEventListener('DOMContentLoaded', initAdminStreamsPage);
