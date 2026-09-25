const STEP_TYPES = {
  theory: { icon: 'T', label: 'Теория' },
  quiz: { icon: '?', label: 'Вопрос' },
  scratch: { icon: 'S', label: 'Scratch' },
  minecraft_edu: { icon: 'M', label: 'Minecraft' },
  code_test: { icon: '</>', label: 'Задача' },
  project: { icon: 'P', label: 'Проект' }
};

const stepIcon = type => STEP_TYPES[type]?.icon || '#';
const stepLabel = type => STEP_TYPES[type]?.label || type;

const COURSE_TYPES = {
  scratch: { art: 'green', label: 'SCRATCH 3.0', short: 'Scratch' },
  minecraft_edu: { art: 'blue', label: 'MINECRAFT EDUCATION', short: 'Minecraft' },
  algorithm: { art: 'coral', label: 'PYTHON 3 АЛГОРИТМИКА', short: 'Python' }
};

const courseType = type => COURSE_TYPES[type] || { art: 'coral', label: String(type || 'КУРС').toUpperCase(), short: type || 'Курс' };

// Course from ?course=, then the last opened one, then the first course in the catalog.
async function resolveCourseId() {
  const params = new URLSearchParams(window.location.search);
  let courseId = params.get('course') || localStorage.getItem('pixelstart_active_course');

  if (!courseId) {
    const courses = await getCourses();

    if (!courses.length) throw new Error('Курсы пока не добавлены.');

    courseId = String(courses[0].id);
  }

  localStorage.setItem('pixelstart_active_course', courseId);
  updateCourseLinks(courseId);

  return courseId;
}

// Loads course steps. Without access (403) it explains how to enrol instead of an endless "loading" state.
async function loadCourseTasks(courseId, mount) {
  try {
    return await api.get(`/courses/${courseId}/tasks`);
  } catch (error) {
    if (error.status !== 403 || !mount) throw error;

    mount.innerHTML = `
      <p class="eyebrow">Нет доступа</p>
      <h2>Курс откроется после зачисления в поток</h2>
      <p style="color:var(--muted); line-height:1.6; margin:12px 0 18px;">Подайте заявку на странице курса: куратор рассмотрит её и откроет уроки и задания.</p>
      <a class="button button-dark" href="index.html?course=${Number(courseId)}">Записаться на курс</a>`;

    return null;
  }
}

const criteriaBox = (criteria, title = 'Критерии шага:') => criteria ? `
  <div class="criteria-box" style="margin-top:8px;">
    <div class="criteria-title">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      ${escapeHtml(title)}
    </div>
    <div class="criteria-item">${escapeHtml(criteria)}</div>
  </div>` : '';

// One course card for the catalog and "My courses".
function courseCard(course, { meta = `Курс #${course.id}`, actions }) {
  const kind = courseType(course.type);

  return `<article class="card course-card" data-course-type="${escapeHtml(course.type)}">
    <div class="course-art ${kind.art}">
      <span class="art-label">${escapeHtml(kind.label)}</span>
      <div class="art-code">${escapeHtml(course.grades || `Курс #${course.id}`)}</div>
    </div>
    <div class="course-body">
      <div class="course-meta">
        <span>${escapeHtml(course.type)}</span>
        <span>${escapeHtml(meta)}</span>
      </div>
      <h3>${escapeHtml(course.title)}</h3>
      <div class="course-passport-badges">
        ${course.grades ? `<span class="course-passport-pill grade">${escapeHtml(course.grades)}</span>` : ''}
        ${course.volume ? `<span class="course-passport-pill">${escapeHtml(course.volume)}</span>` : ''}
        ${course.tool ? `<span class="course-passport-pill tool">${escapeHtml(course.tool.split(',')[0])}</span>` : ''}
      </div>
      <p style="color:var(--muted); font-size:13px; line-height:1.5; margin-bottom:18px;">
        ${escapeHtml(course.goal || course.description || 'Официальная программа курса.')}
      </p>
      ${actions}
    </div>
  </article>`;
}
