function playVictoryChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;

    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const startTime = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.08);
      gain.gain.setValueAtTime(0.18, startTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime + idx * 0.08);
      osc.stop(startTime + idx * 0.08 + 0.45);
    });
  } catch (e) {}
}

function triggerCelebration(title = 'Уровень пройден', subtitle = 'Алгоритм успешно выполнен', xp = 100) {
  playVictoryChime();

  let modal = document.querySelector('.celebration-modal');

  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'celebration-modal';

    modal.innerHTML = `
      <canvas class="celebration-canvas"></canvas>
      <div class="celebration-card">
        <div class="celebration-badge-icon">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#b8f34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 class="celebration-title"></h2>
        <p class="celebration-subtitle"></p>
        <div class="celebration-xp-pill">+<span class="xp-val"></span> XP начислено</div>
        <div>
          <button class="button button-lime close-celebration">Продолжить</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.close-celebration').addEventListener('click', () => {
      modal.classList.remove('visible');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('visible');
    });
  }

  modal.querySelector('.celebration-title').textContent = title;
  modal.querySelector('.celebration-subtitle').textContent = subtitle;
  modal.querySelector('.xp-val').textContent = xp;
  modal.classList.add('visible');

  const canvas = modal.querySelector('.celebration-canvas');

  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    const particles = [];
    const colors = ['#b8f34a', '#ffdf66', '#9edbf4', '#ff9d82', '#ffffff'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.75) * 18,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 12,
        life: 1,
        decay: Math.random() * 0.012 + 0.008
      });
    }

    let animId;

    function renderConfetti() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38;
        p.rotation += p.rSpeed;
        p.life -= p.decay;

        if (p.life > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive) {
        animId = requestAnimationFrame(renderConfetti);
      }
    }

    renderConfetti();
  }
}

window.triggerCelebration = triggerCelebration;

function playChime(success) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;

    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {}
}

window.playChime = playChime;
