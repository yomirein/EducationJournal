function initStudentDashboard() {
  if (!window.location.pathname.includes('/student/index.html') && !window.location.pathname.endsWith('/student/')) return;

  // Progress, points and the next step come from one source: GET /users/me/rating.
  registerLoader(async () => {
    const rating = await api.get('/users/me/rating');
    const courses = rating.courses;
    const total = courses.reduce((sum, item) => sum + item.total, 0);
    const completed = courses.reduce((sum, item) => sum + item.passed, 0);
    const percent = total ? Math.round(completed / total * 100) : 0;
    const percentEl = document.querySelector('[data-overall-percent]');

    if (percentEl) percentEl.textContent = `${percent}%`;

    const progressEl = document.querySelector('[data-overall-progress]');

    if (progressEl) progressEl.style.width = `${percent}%`;

    const completedEl = document.querySelector('[data-completed-count]');

    if (completedEl) completedEl.textContent = String(completed);

    const badgeEl = document.querySelector('[data-student-steps-count]');

    if (badgeEl) badgeEl.textContent = `${completed} ${plural(completed, 'шаг', 'шага', 'шагов')}`;

    const xpEl = document.querySelector('[data-load="/users/me/rating"]');

    if (xpEl) xpEl.textContent = `${rating.total_points} XP`;

    const openLink = document.querySelector('[data-open-current-course]');
    const current = courses.find(item => item.next_step);

    if (openLink) openLink.href = current ? nextStepUrl(current) : 'catalog.html';

    const list = document.querySelector('[data-course-progress-list]');

    if (list) {
      list.innerHTML = courses.length ? courses.map(item => `<div class="radar-metric-item">
        <div class="radar-metric-header"><span>${escapeHtml(item.course_title)}</span><span>${item.passed} / ${item.total}</span></div>
        <div class="radar-metric-bar"><div class="radar-metric-fill" style="width:${item.percent}%"></div></div>
      </div>`).join('') : 'Вы пока не записаны на курсы.';
    }

    const radar = document.getElementById('radar-svg-container');

    if (courses.length >= 3) {
      renderSkillRadarSvg(courses.map(item => ({ label: courseType(item.course_type).short, value: item.percent / 100, display: `${item.percent}%` })));
    } else if (radar) {
      radar.replaceChildren();
    }

    renderRatingBreakdown(rating);
  });

  const schedPre = document.querySelector('[data-load="/users/me/schedule"]');

  if (schedPre) {
    api.get('/users/me/schedule').then(items => {
      if (!items || items.length === 0) {
        schedPre.outerHTML = '<p style="color:var(--muted); font-size:13px; padding:8px 0;">Учебный маршрут пока пуст.</p>';

        return;
      }

      const html = `<div class="interactive-feed-list">` + items.map(item => `
        <div class="feed-item">
          <div>
            <div class="feed-title">${escapeHtml(item.course_title || item.stream_name || 'Занятие')}</div>
            <div class="feed-meta">Куратор: ${escapeHtml(item.curator_name || 'Назначается')}</div>
          </div>
          <a class="button button-soft" style="min-height:32px; padding:0 10px; font-size:11px;" href="${item.course_id ? `course/index.html?course=${Number(item.course_id)}` : 'courses.html'}">
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
        const statusBadge = sub.grade === -1
          ? '<span class="status status-review sub-grade">На проверке</span>'
          : `<span class="status ${isPassedSubmission(sub) ? 'status-done' : 'status-failed'} sub-grade">${Number(sub.grade || 0)} / 100</span>`;

        return `
          <div class="feed-item">
            <div>
              <div class="feed-title">${sub.step_number ? `Шаг ${escapeHtml(sub.step_number)} · ` : ''}${escapeHtml(sub.task_title || `Задание #${sub.task_id}`)} · ${escapeHtml(stepLabel(sub.task_type))}</div>
              <div class="feed-meta">${escapeHtml(sub.feedback_message || 'Решение сохранено')}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              ${statusBadge}
              <a class="button button-soft" style="min-height:30px; padding:0 10px; font-size:11px;" href="course/tasks.html?course=${Number(sub.course_id || 0)}&task=${Number(sub.task_id)}">
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

document.addEventListener('DOMContentLoaded', initStudentDashboard);
