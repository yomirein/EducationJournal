const formatLastActivity = value => value
  ? new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  : 'нет сданных работ';

// One line of a student's progress for curator lists; flags reasons to step in.
function progressLine(row) {
  if (!row) return '';

  const warnings = row.risk_reasons.map(reason => `<span class="status status-failed">${escapeHtml(reason)}</span>`).join(' ');

  return `<div style="font-size:12px; color:var(--muted); margin-top:6px; line-height:1.6;">
    Пройдено ${row.passed} из ${row.total} (${row.percent}%, по графику ${row.expected_percent}%) · ${row.points} баллов · место ${row.rank}
    · последняя работа: ${formatLastActivity(row.last_activity)}
    ${warnings ? `<div style="margin-top:4px; display:flex; gap:6px; flex-wrap:wrap;">${warnings}</div>` : ''}
  </div>`;
}

function initCuratorRiskBoard() {
  const body = document.querySelector('[data-risk-body]');

  if (!body) return;

  registerLoader(async () => {
    const streams = await api.get('/users/me/streams');

    const perStream = await Promise.all(streams.map(async stream => ({
      stream,
      rows: await api.get(`/streams/${stream.stream_id}/progress`)
    })));

    const atRisk = perStream.flatMap(({ stream, rows }) => rows
      .filter(row => row.risk_reasons.length)
      .map(row => ({ ...row, stream_name: stream.stream_name })));

    // A student may study in several streams: count people, not enrolments.
    const students = new Set(perStream.flatMap(item => item.rows.map(row => row.user_id))).size;

    if (!atRisk.length) {
      body.innerHTML = `<p style="color:var(--muted);">Все ${students} ${plural(students, 'ученик идёт', 'ученика идут', 'учеников идут')} по графику и сдают работы. Предупреждение появится, если ученик отстанет от графика потока на 20% или не будет сдавать работы 7 дней.</p>`;

      return;
    }

    body.innerHTML = `
      <p style="color:var(--muted); margin:0 0 12px;">${new Set(atRisk.map(row => row.user_id)).size} из ${students} ${plural(students, 'ученика', 'учеников', 'учеников')} стоит поддержать сейчас, пока они не перестали заходить.</p>
      <div class="participants-grid">${atRisk.map(row => `
        <div class="participant-item">
          <div class="participant-info">
            <div>
              <strong style="font-size:14px; display:block;">${escapeHtml(row.student_name)}</strong>
              <span style="font-size:11px; color:var(--muted);">${escapeHtml(row.stream_name)} · @${escapeHtml(row.username)}</span>
              ${progressLine(row)}
            </div>
          </div>
          <div class="participant-actions">
            <a class="button button-soft" href="broadcast.html">Написать потоку</a>
          </div>
        </div>`).join('')}
      </div>`;
  });
}

document.addEventListener('DOMContentLoaded', initCuratorRiskBoard);
