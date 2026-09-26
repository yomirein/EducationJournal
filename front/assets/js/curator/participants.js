function initCuratorParticipants() {
  const pre = document.querySelector('[data-result="participants"]');

  if (!pre || !window.location.pathname.includes('participants.html')) return;

  const card = pre.closest('.card');

  if (!card) return;

  let grid = card.querySelector('[data-participants-grid]');

  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'participants-grid';
    grid.setAttribute('data-participants-grid', 'true');
    pre.after(grid);
    pre.style.display = 'none';
  }

  window.refreshCuratorParticipants = async () => {
    const streamId = card.querySelector('[name="stream_id"]')?.value;

    if (!streamId) {
      grid.innerHTML = '<p style="color:var(--muted); padding:10px 0;">У вас пока нет потоков.</p>';

      return;
    }

    let participants;
    let progress;

    try {
      [participants, progress] = await Promise.all([
        api.get(`/streams/${streamId}/participants`),
        api.get(`/streams/${streamId}/progress`)
      ]);
    } catch (error) {
      grid.innerHTML = `<p class="error-copy" style="padding:10px 0;">${escapeHtml(errorText(error))}</p>`;

      return;
    }

    if (participants.length === 0) {
      grid.innerHTML = '<p style="color:var(--muted); padding:10px 0;">В потоке пока нет заявок.</p>';

      return;
    }

    grid.innerHTML = participants.map(p => {
      const [statusText, statusCss] = {
        accepted: ['Принят', 'status-done'],
        rejected: ['Отклонён', 'status-failed']
      }[p.status] || ['Ожидает решения', 'status-review'];

      return `
        <div class="participant-item">
          <div class="participant-info">
            <div class="avatar-circle">#${Number(p.user_id)}</div>
            <div>
              <strong style="font-size:14px; display:block;">${escapeHtml(`${p.first_name || ''} ${p.last_name || ''}`.trim() || `Ученик #${p.user_id}`)}</strong>
              <span style="font-size:11px; color:var(--muted);">@${escapeHtml(p.username || '')} · ID ${Number(p.user_id)}</span>
              <span class="status ${statusCss}" style="margin-top:4px;">${statusText}</span>
              ${progressLine(progress.find(row => row.user_id === p.user_id))}
            </div>
          </div>
          <div class="participant-actions">
            ${p.status !== 'accepted' ? `<button class="button button-lime accept-p-btn" data-uid="${Number(p.user_id)}">Принять</button>` : ''}
            ${p.status !== 'rejected' ? `<button class="button button-danger reject-p-btn" data-uid="${Number(p.user_id)}">${p.status === 'accepted' ? 'Исключить' : 'Отклонить'}</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.accept-p-btn').forEach(btn => {
      btn.addEventListener('click', () => run(async () => {
        await api.post(`/streams/${streamId}/participants/${btn.dataset.uid}/accept`, {});
        await window.refreshCuratorParticipants();
      }, `Заявка ученика #${btn.dataset.uid} принята.`));
    });

    grid.querySelectorAll('.reject-p-btn').forEach(btn => {
      btn.addEventListener('click', () => run(async () => {
        await api.post(`/streams/${streamId}/participants/${btn.dataset.uid}/reject`, {});
        await window.refreshCuratorParticipants();
      }, `Заявка ученика #${btn.dataset.uid} отклонена.`));
    });
  };

  // The first load is triggered by the stream picker once the curator's streams arrive.
  card.querySelector('[data-load-target="participants"]')?.addEventListener('click', () => registerLoader(window.refreshCuratorParticipants));
}

document.addEventListener('DOMContentLoaded', initCuratorParticipants);
