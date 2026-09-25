const renderJson = (output, data) => {
  output.textContent = JSON.stringify(data, null, 2);
  output.setAttribute('aria-busy', 'false');
};

document.querySelectorAll('pre.data-output[data-load]').forEach(output => {
  output.setAttribute('aria-busy', 'true');
  registerLoader(async () => renderJson(output, await api.get(output.dataset.load)));
});

// The curator's stream picker on the broadcast page drives the feed below the form.
const selectedStream = () => document.querySelector('select[data-stream-reload="broadcasts"]');

const loadTargets = {
  broadcasts: () => {
    const streamId = Number(selectedStream()?.value);

    if (!streamId) throw new Error('Сначала выберите поток.');

    return `/streams/${streamId}/broadcasts`;
  }
};

const renderBroadcastFeed = (output, items) => {
  output.setAttribute('aria-busy', 'false');

  if (!items.length) {
    output.innerHTML = '<div class="empty-state-box">В этом потоке пока нет объявлений. Напишите первое сообщение выше.</div>';

    return;
  }

  const picker = selectedStream();
  const streamName = picker?.selectedOptions[0]?.textContent || 'Поток';

  output.innerHTML = `<div class="broadcast-feed-list">${items.map(item => `
    <div class="broadcast-feed-card">
      <div class="broadcast-feed-header">
        <span class="broadcast-stream-tag">${escapeHtml(streamName)}</span>
        <span class="broadcast-date-label">${item.timestamp ? new Date(item.timestamp).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
      </div>
      <p class="broadcast-feed-text">${escapeHtml(item.text)}</p>
    </div>`).join('')}</div>`;
};

// Blocks with a dedicated view; everything else is shown as raw JSON.
const loadRenderers = { broadcasts: renderBroadcastFeed };

document.querySelectorAll('[data-load-target]').forEach(button => {
  const pathFor = loadTargets[button.dataset.loadTarget];
  const output = document.querySelector(`[data-result="${button.dataset.loadTarget}"]`);

  if (!pathFor || !output) return;

  // Registered on first use, then re-run by refreshPageData() after changes.
  const render = loadRenderers[button.dataset.loadTarget] || renderJson;

  const loader = async () => {
    const path = pathFor(button.closest('section') || document);

    output.setAttribute('aria-busy', 'true');
    render(output, await api.get(path));
  };

  button.addEventListener('click', () => registerLoader(loader));
});
