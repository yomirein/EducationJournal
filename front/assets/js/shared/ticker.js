function initLiveTicker() {
  if (document.getElementById('platform-live-ticker')) return;

  const ticker = document.createElement('div');
  ticker.id = 'platform-live-ticker';
  ticker.className = 'live-ticker';

  ticker.innerHTML = `
    <div class="ticker-content">
      <span class="ticker-ping"></span>
      <span id="ticker-msg-text">Теория · контрольные вопросы · проекты · задачи с тестами</span>
    </div>
    <div style="opacity:0.6; font-size:10px; font-family:monospace; display:flex; gap:12px;">
      <span>PIXELSTART</span>
      <span>УЧЕБНЫЙ МАРШРУТ</span>
    </div>
  `;

  document.body.prepend(ticker);

  const messages = ['Теория · контрольные вопросы · проекты · задачи с тестами'];

  // Catalog facts come from the API, not from hardcoded numbers.
  getCourses().then(courses => {
    if (!courses.length) return;

    messages.unshift(
      `${courses.length} ${plural(courses.length, 'курс', 'курса', 'курсов')} в каталоге`,
      courses.map(course => course.title).join(' · ')
    );
  }).catch(() => {});

  let idx = 0;
  const msgEl = ticker.querySelector('#ticker-msg-text');

  setInterval(() => {
    idx = (idx + 1) % messages.length;

    if (msgEl) {
      msgEl.style.opacity = '0';
      msgEl.style.transition = 'opacity 0.25s ease';

      setTimeout(() => {
        msgEl.textContent = messages[idx];
        msgEl.style.opacity = '1';
      }, 250);
    }
  }, 6000);
}

document.addEventListener('DOMContentLoaded', initLiveTicker);
