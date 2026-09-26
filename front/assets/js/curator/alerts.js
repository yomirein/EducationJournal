function initCuratorAlertsRadar() {
  if (!window.location.pathname.includes('/curator/')) return;

  api.get('/panel/stats/curator-alerts').then(res => {
    if (!res) return;

    const activeCount = res.active_students ?? res.active_students_count ?? 0;
    const pendingCount = res.pending_count !== undefined ? res.pending_count : (res.pending_submissions ? res.pending_submissions.length : 0);

    const statStudents = document.getElementById('curator-stat-students');

    if (statStudents) {
      statStudents.textContent = `${activeCount} учеников`;
    }

    const statSubmissions = document.getElementById('curator-stat-submissions');

    if (statSubmissions) {
      statSubmissions.textContent = `${pendingCount} на проверке`;
    }

    const radarEl = document.getElementById('curator-alerts-radar');

    if (radarEl) {
      radarEl.innerHTML = `
        <div class="card" style="padding:20px; border-left:4px solid var(--accent); margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <span class="status status-review">Радар куратора</span>
              <h3 style="margin:6px 0 2px; font-size:16px;">В очереди ${pendingCount} работ, требующих рецензии</h3>
              <p style="font-size:12px; color:var(--muted); margin:0;">Откройте очередь, оцените проект и оставьте ученику конкретный отзыв.</p>
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

  api.get('/users/me/streams').then(streams => {
    const count = document.getElementById('curator-stat-streams');

    if (count) count.textContent = String(streams.length);
  }).catch(() => {});
}

document.addEventListener('DOMContentLoaded', initCuratorAlertsRadar);
