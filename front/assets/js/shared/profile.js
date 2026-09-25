function initStudentProfilePage() {
  const mount = document.getElementById('profile-view-mount');

  if (!mount) return;

  registerLoader(async () => {
    const user = await getCurrentUser();
    const isStudent = user.role === 'student';

    // Learning progress and rating exist only for students; staff see their streams instead.
    const [rating, streams, leaderboard] = await Promise.all([
      isStudent ? api.get('/users/me/rating') : null,
      api.get('/users/me/streams'),
      isStudent ? api.get('/users/leaderboard').catch(() => []) : []
    ]);

    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username[0].toUpperCase();

    const streamsBox = label => `
        <div class="profile-stat-box">
          <span class="profile-stat-val">${streams.length}</span>
          <span class="profile-stat-label">${label}</span>
        </div>`;

    let stats;

    if (isStudent) {
      const passed = rating.courses.reduce((sum, course) => sum + course.passed, 0);
      // The league comes from the same leaderboard the student sees, so the numbers always agree.
      const place = leaderboard.find(row => row.user_id === user.id);

      const league = place
        ? `<span class="league-pill league-${escapeHtml((place.league || 'silver').toLowerCase())}">${escapeHtml(place.league_title)}</span>`
        : '—';

      stats = `
        <div class="profile-stat-box">
          <span class="profile-stat-val accent">${rating.total_points}</span>
          <span class="profile-stat-label">Баллов рейтинга</span>
        </div>
        <div class="profile-stat-box">
          <span class="profile-stat-val">${passed}</span>
          <span class="profile-stat-label">${plural(passed, 'Шаг зачтён', 'Шага зачтено', 'Шагов зачтено')}</span>
        </div>
        ${streamsBox(plural(streams.length, 'Поток обучения', 'Потока обучения', 'Потоков обучения'))}
        <div class="profile-stat-box">
          <span class="profile-stat-val">${league}</span>
          <span class="profile-stat-label">Текущая лига</span>
        </div>`;
    } else {
      stats = streamsBox(user.role === 'admin'
        ? plural(streams.length, 'Поток на платформе', 'Потока на платформе', 'Потоков на платформе')
        : plural(streams.length, 'Ваш поток', 'Ваших потока', 'Ваших потоков'));
    }

    mount.innerHTML = `
      <div class="profile-hero-card">
        <div class="profile-avatar-wrap">${escapeHtml(initials)}</div>
        <div class="profile-info">
          <div class="profile-info-header">
            <h2 class="profile-name">${escapeHtml(fullName)}</h2>
            <span class="profile-role-pill">${escapeHtml(roleLabels[user.role] || user.role)}</span>
            <span class="profile-status-pill">${user.is_verified ? 'Почта подтверждена' : 'Почта не подтверждена'}</span>
          </div>
          <div class="profile-username">@${escapeHtml(user.username)} · ID #${Number(user.id)}</div>
          <div class="profile-meta-row">
            <span class="profile-meta-item">${escapeHtml(user.email)}</span>
            ${user.description ? `<span class="profile-meta-item" style="color:var(--ink);">«${escapeHtml(user.description)}»</span>` : ''}
          </div>
        </div>
      </div>
      <div class="profile-stats-grid">${stats}
      </div>`;
  });
}

document.addEventListener('DOMContentLoaded', initStudentProfilePage);
