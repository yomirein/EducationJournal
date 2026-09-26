function renderSkillRadarSvg(metrics) {
  const container = document.getElementById('radar-svg-container');

  if (!container || !metrics?.length) return;

  const width = 280;
  const height = 250;
  const cx = width / 2;
  const cy = height / 2 + 5;
  const radius = 78;

  const total = metrics.length;

  const getCoordinates = (r, i) => {
    const angle = -Math.PI / 2 + i * (2 * Math.PI / total);

    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  };

  const rings = [0.25, 0.5, 0.75, 1.0];

  const ringsHtml = rings.map(scale => {
    const points = Array.from({ length: total }, (_, i) => {
      const pt = getCoordinates(radius * scale, i);

      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');

    const isOuter = scale === 1.0;

    return `<polygon points="${points}" fill="${isOuter ? 'rgba(21, 33, 28, 0.4)' : 'none'}" stroke="${isOuter ? '#2f493b' : '#1e3026'}" stroke-width="1" stroke-dasharray="${isOuter ? 'none' : '2,2'}" />`;
  }).join('');

  const axesHtml = Array.from({ length: total }, (_, i) => {
    const pt = getCoordinates(radius, i);

    return `<line x1="${cx}" y1="${cy}" x2="${pt.x.toFixed(1)}" y2="${pt.y.toFixed(1)}" stroke="#283e32" stroke-width="1" />`;
  }).join('');

  const dataPoints = metrics.map((m, i) => {
    const pt = getCoordinates(radius * m.value, i);

    return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }).join(' ');

  const dotsHtml = metrics.map((m, i) => {
    const pt = getCoordinates(radius * m.value, i);

    return `
      <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4" fill="#b8f34a" stroke="#15211c" stroke-width="2">
        <title>${escapeHtml(m.label)}: ${escapeHtml(m.display)}</title>
      </circle>
    `;
  }).join('');

  const labelsHtml = metrics.map((m, i) => {
    const pt = getCoordinates(radius + 18, i);
    let anchor = 'middle';

    if (pt.x < cx - 12) anchor = 'end';
    else if (pt.x > cx + 12) anchor = 'start';

    return `<text x="${pt.x.toFixed(1)}" y="${(pt.y + 3).toFixed(1)}" fill="#8c9e94" font-size="9" font-family="monospace" text-anchor="${anchor}">${escapeHtml(m.label)}</text>`;
  }).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="overflow:visible;">
      <defs>
        <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#b8f34a" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#7caf22" stop-opacity="0.12" />
        </radialGradient>
      </defs>
      ${ringsHtml}
      ${axesHtml}
      <polygon points="${dataPoints}" fill="url(#radarGrad)" stroke="#b8f34a" stroke-width="2.5" stroke-linejoin="round" />
      ${dotsHtml}
      ${labelsHtml}
    </svg>
  `;
}
