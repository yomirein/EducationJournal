const isPassedSubmission = item => item.grade >= 50 && (item.task_type !== 'code_test' || item.grade === 100);

// Russian plural form: plural(3, 'шаг', 'шага', 'шагов') -> 'шага'.
const plural = (count, one, few, many) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;

  return many;
};

// Escapes text for both element content and quoted attribute values.
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Allows only same-origin relative links and http(s) URLs in href attributes.
function safeHref(url, fallback = '#') {
  const value = String(url ?? '').trim();

  if (!value) return fallback;

  try {
    const parsed = new URL(value, window.location.href);

    return ['http:', 'https:'].includes(parsed.protocol) ? escapeHtml(value) : fallback;
  } catch {
    return fallback;
  }
}
