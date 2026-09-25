const STEP_STATUS = {
  passed: { label: 'Зачтён', css: 'status-done' },
  failed: { label: 'Не зачтён', css: 'status-failed' },
  pending: { label: 'На проверке', css: 'status-review' },
  not_started: { label: 'Не начат', css: 'status-idle' }
};

const nextStepUrl = course => `/student/course/tasks.html?course=${Number(course.course_id)}&task=${Number(course.next_step.task_id)}`;

const nextStepLabel = step => `${step.step_number ? `Шаг ${escapeHtml(step.step_number)} · ` : ''}${escapeHtml(step.title)}`;

// Shows where every point came from, so the number is never unexplained.
function renderRatingBreakdown(rating) {
  const body = document.querySelector('[data-rating-body]');

  if (!body) return;

  if (!rating.courses.length) {
    body.innerHTML = '<p style="color:var(--muted);">Вы пока не зачислены ни в один поток. <a href="catalog.html">Выберите курс в каталоге</a> и подайте заявку.</p>';

    return;
  }

  const courseBlock = course => {
    const lag = course.expected_percent - course.percent;

    const pace = lag >= 20
      ? `<span class="status status-failed">Отставание от графика: ${lag}%</span>`
      : '<span class="status status-done">Идёте по графику</span>';

    const next = course.next_step
      ? `<a class="button button-dark" href="${nextStepUrl(course)}">Дальше: ${nextStepLabel(course.next_step)}</a>`
      : course.pending
        ? '<span class="status status-review">Все шаги сданы, ждём оценку куратора</span>'
        : '<span class="status status-done">Курс пройден</span>';

    return `<article class="card" style="margin-top:14px;">
      <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start;">
        <div>
          <h3 style="margin:0 0 4px;">${escapeHtml(course.course_title)}</h3>
          <span style="font-size:12px; color:var(--muted);">${escapeHtml(course.stream_name)}</span>
        </div>
        <div style="text-align:right;">
          <strong style="font-size:20px;">${course.points} баллов</strong>
          <span style="display:block; font-size:12px; color:var(--muted);">Место ${course.rank} из ${course.participants} в потоке</span>
        </div>
      </div>
      <p style="margin:12px 0 6px; font-size:13px;">Пройдено ${course.passed} из ${course.total} ${plural(course.total, 'шага', 'шагов', 'шагов')} (${course.percent}%). По графику потока к сегодняшнему дню — ${course.expected_percent}%.</p>
      <div class="progress"><span style="width:${course.percent}%"></span></div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin:14px 0 4px;">${pace} ${next}</div>
      <details style="margin-top:10px;">
        <summary style="cursor:pointer; font-weight:700; font-size:13px;">Разбивка по шагам</summary>
        <div class="table-responsive">
          <table class="leaderboard-table" style="margin-top:8px;">
            <thead><tr><th>Шаг</th><th>Проверка</th><th>Статус</th><th style="text-align:right;">Баллы</th></tr></thead>
            <tbody>${course.steps.map(step => `<tr>
              <td>${nextStepLabel(step)}</td>
              <td>${step.check === 'curator' ? 'Куратор' : 'Автоматически'}</td>
              <td><span class="status ${STEP_STATUS[step.status].css}">${STEP_STATUS[step.status].label}${step.grade > 0 ? ` · ${step.grade}` : ''}</span></td>
              <td style="text-align:right; font-weight:700;">${step.points}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </details>
    </article>`;
  };

  body.innerHTML = `
    <p style="margin:0 0 4px;">Всего: <strong>${rating.total_points} баллов</strong>.</p>
    <ul style="margin:6px 0 0; padding-left:18px; font-size:13px; color:var(--muted); line-height:1.6;">
      ${rating.rules.map(rule => `<li>${escapeHtml(rule)}</li>`).join('')}
    </ul>
    ${rating.courses.map(courseBlock).join('')}`;
}
