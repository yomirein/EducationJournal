function initStudentLeaderboardPage() {
  const tbody = document.getElementById('leaderboard-tbody');
  const podiumMount = document.getElementById('leaderboard-podium');

  if (!tbody && !podiumMount) return;

  Promise.all([api.get('/users/leaderboard'), getCurrentUser().catch(() => null)]).then(([data, currentUser]) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--muted);">Рейтинговая таблица пока формируется.</td></tr>`;

      return;
    }

    const currentUserName = currentUser?.username || '';

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
            <div class="podium-league-tag">${escapeHtml(p.league_name || p.league_title || 'Серебряная лига')}</div>
            <div class="podium-xp-score">${Number(p.total_xp ?? p.xp ?? 0)} XP</div>
            <div class="podium-stand-box">
              <span class="podium-stand-rank">${label}</span>
              <span class="podium-stand-streak">Зачтено: ${Number(p.tasks_completed || 0)}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    let currentFilter = 'all';

    const renderTable = () => {
      if (!tbody) return;

      const filtered = data.filter(u => {
        if (currentFilter === 'all') return true;

        const l = (u.league || '').toLowerCase();

        return l === currentFilter;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--muted);">В этой лиге пока нет участников.</td></tr>`;

        return;
      }

      tbody.innerHTML = filtered.map(u => {
        const isCurrent = u.username === currentUserName;
        const leagueClass = (u.league || 'silver').toLowerCase();

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
                  <div style="font-weight:700; color:var(--text);">${escapeHtml(u.full_name || u.username)} ${isCurrent ? '<span class="status status-done" style="font-size:10px; margin-left:4px;">Вы</span>' : ''}</div>
                  <div style="font-size:11px; color:var(--muted);">@${escapeHtml(u.username)}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="league-pill league-${leagueClass}">${escapeHtml(u.league_name || u.league_title || 'Серебряная лига')}</span>
            </td>
            <td style="text-align:center; font-weight:700; color:var(--text);">
              ${u.tasks_completed || 0}
            </td>
            <td style="text-align:right; padding-right:24px; font-weight:800; font-size:15px; color:var(--lime-dark);">
              ${Number(u.total_xp ?? u.xp ?? 0)} XP
            </td>
          </tr>
        `;
      }).join('');
    };

    renderTable();

    const tabs = document.getElementById('leaderboard-tabs');

    if (tabs) {
      tabs.querySelectorAll('.chip-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          tabs.querySelectorAll('.chip-toggle').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentFilter = btn.dataset.filter || 'all';
          renderTable();
        });
      });
    }

    const stickyBar = document.getElementById('student-sticky-rank');
    const myData = data.find(u => u.username === currentUserName);

    if (stickyBar && myData) {
      const completedBadge = document.querySelector('[data-leaderboard-completed]');

      if (completedBadge) completedBadge.textContent = `${Number(myData.tasks_completed || 0)} ${plural(Number(myData.tasks_completed || 0), 'задача', 'задачи', 'задач')}`;

      stickyBar.innerHTML = `
        <div class="rank-stat">
          <span class="rank-num">#${Number(myData.rank)}</span>
          <div>
            <strong>Ваша позиция</strong>
            <span style="display:block; font-size:11px; color:var(--muted);">${escapeHtml(myData.league_title || 'Серебряная лига')} · ${Number(myData.tasks_completed || 0)} ${plural(Number(myData.tasks_completed || 0), 'зачтённое задание', 'зачтённых задания', 'зачтённых заданий')}</span>
          </div>
        </div>
        <strong style="font-size:18px; color:var(--lime-dark);">${Number(myData.total_xp ?? myData.xp ?? 0)} XP</strong>
      `;

      stickyBar.style.display = 'flex';
    } else if (stickyBar) {
      stickyBar.style.display = 'none';
    }
  }).catch(() => {});
}

document.addEventListener('DOMContentLoaded', initStudentLeaderboardPage);
