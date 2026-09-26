const myCoursesGrid = document.querySelector('[data-my-courses-grid]');

if (myCoursesGrid) {
  registerLoader(async () => {
    // Only courses of streams the user is enrolled in (curators: their streams, admins: all).
    const streams = await api.get('/users/me/streams');

    if (!streams.length) {
      myCoursesGrid.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; padding: 32px; text-align: center;">
          <p style="color:var(--muted); margin-bottom:14px;">У вас пока нет активных потоков.</p>
          <a class="button button-lime" href="catalog.html">Выбрать курс в каталоге <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle; margin-left:4px;"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></a>
        </div>`;

      return;
    }

    myCoursesGrid.innerHTML = streams.map(stream => courseCard({
      id: stream.course_id,
      title: stream.course_title,
      description: stream.course_description,
      type: stream.course_type,
      grades: stream.course_grades,
      volume: stream.course_volume,
      tool: stream.course_tool,
      goal: stream.course_goal
    }, {
      meta: stream.stream_name,
      actions: `<div style="display:flex; gap:8px; flex-wrap:wrap;">
        <a class="button button-dark" href="course/index.html?course=${Number(stream.course_id)}">Продолжить курс <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle; margin-left:4px;"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></a>
        <a class="button button-soft" href="course/lessons.html?course=${Number(stream.course_id)}">Уроки</a>
      </div>`
    })).join('');
  });
}

const loadCourses = document.querySelector('[data-courses]');

if (loadCourses) {
  registerLoader(async () => {
    const courses = await getCourses();

    loadCourses.setAttribute('aria-busy', 'false');

    if (!courses.length) {
      loadCourses.innerHTML = '<p style="color:var(--muted); padding:24px 0;">В каталоге пока нет доступных курсов.</p>';

      return;
    }

    loadCourses.innerHTML = courses.map(course => courseCard(course, {
      actions: `<a class="button button-dark" href="course/index.html?course=${Number(course.id)}">Открыть курс <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle; margin-left:4px;"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></a>`
    })).join('');

    // Keep the active type filter after a reload.
    const filter = document.querySelector('[data-course-filter].active')?.dataset.courseFilter || 'all';

    document.querySelectorAll('[data-course-type]').forEach(card => {
      card.hidden = filter !== 'all' && card.dataset.courseType !== filter;
    });
  });
}

const moduleList = document.querySelector('[data-module-list]');

if (moduleList) {
  const urlParams = new URLSearchParams(window.location.search);

  run(async () => {
    const courseId = await resolveCourseId();

    const [course, modules, history] = await Promise.all([
      api.get(`/courses/${courseId}`),
      api.get(`/courses/${courseId}/modules`),
      api.get('/users/me/history')
    ]);

    if (course) {
      document.querySelector('[data-course-title]')?.replaceChildren(
        document.createTextNode(course.title)
      );

      document.querySelector('[data-course-desc]')?.replaceChildren(
        document.createTextNode(course.goal || course.description || '')
      );
    }

    if (modules.length > 0) {
      const allTaskIds = modules.flatMap(mod => (mod.lessons || []).flatMap(les => (les.tasks || []).map(task => task.id)));
      const passed = new Set(history.filter(isPassedSubmission).map(item => item.task_id));
      const stats = document.querySelector('[data-course-stats]');

      if (stats) stats.textContent = `${modules.length} ${plural(modules.length, 'модуль', 'модуля', 'модулей')} · ${allTaskIds.length} ${plural(allTaskIds.length, 'шаг', 'шага', 'шагов')} · ${passed.size} пройдено`;

      const progress = document.querySelector('[data-course-progress]');

      if (progress) progress.style.width = `${allTaskIds.length ? Math.round(passed.size / allTaskIds.length * 100) : 0}%`;

      moduleList.innerHTML = modules.map((mod, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        const taskIds = (mod.lessons || []).flatMap(les => (les.tasks || []).map(task => task.id));
        const passedCount = taskIds.filter(id => passed.has(id)).length;

        return `<a class="module-row" href="lessons.html?course=${courseId}&module=${mod.id}">
          <span class="module-index">${num}</span>
          <div>
            <h3>${escapeHtml(mod.name || '')}</h3>
            <p>${taskIds.length} ${plural(taskIds.length, 'шаг', 'шага', 'шагов')} · ${escapeHtml(mod.description || 'Практика и теория')}</p>
          </div>
          <span class="module-progress">${passedCount} / ${taskIds.length} пройдено</span>
        </a>`;
      }).join('');
    }
  });
}

const enrollBox = document.querySelector('[data-course-enroll]');

if (enrollBox) {
  const applicationStatus = {
    pending: '<span class="status status-review">Заявка на рассмотрении</span>',
    rejected: '<span class="status status-failed">Заявка отклонена</span>'
  };

  const formatDate = value => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  registerLoader(async () => {
    const user = await getCurrentUser();

    if (user.role !== 'student' || user.payment) {
      enrollBox.hidden = true;

      return;
    }

    const courseId = Number(await resolveCourseId());

    const [streams, applications] = await Promise.all([
      api.get('/streams?limit=100'),
      api.get('/users/me/applications')
    ]);

    const statusOf = streamId => applications.find(item => item.stream_id === streamId)?.status;
    const courseStreams = streams.filter(stream => stream.course_id === courseId);

    // Already enrolled: the course is open, nothing to apply for.
    if (courseStreams.some(stream => statusOf(stream.id) === 'accepted')) {
      enrollBox.hidden = true;

      return;
    }

    enrollBox.hidden = false;

    enrollBox.innerHTML = `
      <p class="eyebrow">Запись на курс</p>
      <h2>Выберите поток</h2>
      <p style="color:var(--muted); margin:6px 0 16px;">Уроки и задания откроются, когда куратор примет заявку.</p>
      ${courseStreams.length ? courseStreams.map(stream => {
        const status = statusOf(stream.id);
        return `<div class="participant-item">
          <div class="participant-info">
            <div>
              <strong style="font-size:14px; display:block;">${escapeHtml(stream.name)}</strong>
              <span style="font-size:12px; color:var(--muted);">${formatDate(stream.start_date)} — ${formatDate(stream.end_date)}</span>
            </div>
          </div>
          <div class="participant-actions">
            ${applicationStatus[status] || ''}
            ${status === 'pending' ? '' : `<button class="button button-lime" type="button" data-join-stream="${Number(stream.id)}">${status === 'rejected' ? 'Подать снова' : 'Подать заявку'}</button>`}
          </div>
        </div>`;
      }).join('') : '<p style="color:var(--muted);">Набор в потоки этого курса пока не открыт.</p>'}`;
  });

  enrollBox.addEventListener('click', event => {
    const button = event.target.closest('[data-join-stream]');

    if (!button) return;

    button.disabled = true;

    run(async () => {
      await api.post(`/streams/${button.dataset.joinStream}/join`);
      await refreshPageData();
    }, 'Заявка отправлена куратору.');
  });
}

const courseNext = document.querySelector('[data-course-next]');

if (courseNext) {
  registerLoader(async () => {
    const user = await getCurrentUser();

    if (user.role !== 'student') return;

    const courseId = Number(await resolveCourseId());
    const course = (await api.get('/users/me/rating')).courses.find(item => item.course_id === courseId);

    if (!course) {
      courseNext.textContent = '';

      return;
    }

    courseNext.innerHTML = course.next_step
      ? `Место ${course.rank} из ${course.participants} · ${course.points} баллов. <a href="${nextStepUrl(course)}">Дальше: ${nextStepLabel(course.next_step)}</a>`
      : `Место ${course.rank} из ${course.participants} · ${course.points} баллов. ${course.pending ? 'Ждём оценку куратора по сданным работам.' : 'Курс пройден.'}`;
  });
}

const ratingRules = document.querySelector('[data-rating-rules-list]');

if (ratingRules) {
  registerLoader(async () => {
    const rating = await api.get('/users/me/rating');

    ratingRules.innerHTML = rating.rules.map(rule => `<li>${escapeHtml(rule)}</li>`).join('')
      + '<li>Подробная разбивка по шагам — в журнале, блок «Из чего сложился результат».</li>';
  });
}

const lessonsPage = document.querySelector('[data-lessons-page]');

if (lessonsPage) {
  const urlParams = new URLSearchParams(window.location.search);
  let activeModuleId = urlParams.get('module') ? Number(urlParams.get('module')) : null;
  let activeTaskId = urlParams.get('task') ? Number(urlParams.get('task')) : null;

  run(async () => {
    const courseId = await resolveCourseId();

    const [course, modules, tasks, history] = await Promise.all([
      api.get(`/courses/${courseId}`),
      api.get(`/courses/${courseId}/modules`),
      loadCourseTasks(courseId, document.querySelector('[data-lesson-main]')),
      api.get('/users/me/history')
    ]);

    if (!tasks) {
      const eyebrow = document.querySelector('[data-module-eyebrow]');

      if (eyebrow) eyebrow.textContent = course.title;

      document.querySelector('[data-lesson-nav]')?.replaceChildren();

      return;
    }

    const passedIds = new Set(history.filter(isPassedSubmission).map(item => item.task_id));

    if (course) {
      const eyebrow = document.querySelector('[data-module-eyebrow]');

      if (eyebrow) {
        eyebrow.textContent = `${course.title} · ${modules.length} ${plural(modules.length, 'модуль', 'модуля', 'модулей')} · ${tasks.length} ${plural(tasks.length, 'шаг', 'шага', 'шагов')}`;
      }

      const pageTitle = document.querySelector('[data-module-title]');

      if (pageTitle) {
        pageTitle.innerHTML = `Учебные модули <em>и шаги</em>`;
      }

      const pageDesc = document.querySelector('[data-module-desc]');

      if (pageDesc) {
        pageDesc.textContent = course.goal || course.description || 'Официальная программа курса.';
      }
    }

    if (!modules || modules.length === 0) return;

    let activeModule = modules.find(m => m.id === activeModuleId) || modules[0];

    activeModuleId = activeModule.id;

    const getModuleTasks = mod => tasks.filter(t => t.module_id === mod.id);

    let modTasks = getModuleTasks(activeModule);

    let activeStep = modTasks.find(t => t.id === activeTaskId) || modTasks[0];

    const sidebarTitle = document.querySelector('[data-sidebar-module-title]');
    const sidebarDesc = document.querySelector('[data-sidebar-module-desc]');
    const lessonNav = document.querySelector('[data-lesson-nav]');
    const lessonMain = document.querySelector('[data-lesson-main]');

    const renderModuleSwitcher = () => {
      let switchBar = document.querySelector('[data-module-switch-bar]');

      if (!switchBar && lessonNav) {
        switchBar = document.createElement('div');
        switchBar.className = 'module-switch-bar';
        switchBar.setAttribute('data-module-switch-bar', 'true');
        lessonNav.parentNode.insertBefore(switchBar, lessonNav);
      }

      if (switchBar) {
        switchBar.innerHTML = modules.map((m, idx) => {
          const isActive = m.id === activeModule.id;

          return `<button class="chip-toggle ${isActive ? 'active' : ''}" data-mod-id="${m.id}" type="button">
            М0${idx + 1}
          </button>`;
        }).join('');

        switchBar.querySelectorAll('[data-mod-id]').forEach(btn => {
          btn.addEventListener('click', () => {
            const mid = Number(btn.dataset.modId);

            activeModule = modules.find(m => m.id === mid) || modules[0];
            modTasks = getModuleTasks(activeModule);
            activeStep = modTasks[0];
            renderModuleSwitcher();
            renderSidebar();
            renderStepDetail();
          });
        });
      }
    };

    const renderSidebar = () => {
      if (sidebarTitle) sidebarTitle.textContent = activeModule.name;
      if (sidebarDesc) sidebarDesc.textContent = activeModule.description || `${modTasks.length} ${plural(modTasks.length, 'шаг', 'шага', 'шагов')} в модуле`;

      const progress = document.querySelector('[data-sidebar-progress]');

      if (progress) progress.style.width = `${modTasks.length ? Math.round(modTasks.filter(task => passedIds.has(task.id)).length / modTasks.length * 100) : 0}%`;

      if (lessonNav) {
        lessonNav.innerHTML = modTasks.map((t, idx) => {
          const isActive = t.id === activeStep.id;
          const stepNum = t.step_number || String(idx + 1).padStart(2, '0');
          const icon = stepIcon(t.type);

          return `<a class="lesson-step-item ${isActive ? 'active' : ''}" data-step-id="${t.id}" href="javascript:void(0)">
            <span class="lesson-step-badge">${icon}</span>
            <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              <strong>${escapeHtml(stepNum)}</strong> · ${escapeHtml(t.title || 'Урок')}
            </div>
          </a>`;
        }).join('');

        lessonNav.querySelectorAll('[data-step-id]').forEach(link => {
          link.addEventListener('click', () => {
            const sid = Number(link.dataset.stepId);

            activeStep = modTasks.find(t => t.id === sid) || modTasks[0];
            renderSidebar();
            renderStepDetail();
          });
        });
      }
    };

    const renderStepDetail = () => {
      if (!lessonMain) return;

      if (!activeStep) {
        lessonMain.innerHTML = '<p style="color:var(--muted); padding:24px 0;">В этом модуле пока нет шагов.</p>';

        return;
      }

      const stepTypeName = stepLabel(activeStep.type);
      const stepNum = activeStep.step_number || '01';
      const checkTypeLabel = activeStep.check_type || 'Автоматическая проверка';

      const descFormatted = escapeHtml(activeStep.description || '')
        .replace(/```python([\s\S]*?)```/g, '<pre class="code-block" style="background:#1e2329; color:#b8f34a; padding:16px; border-radius:8px;"><code>$1</code></pre>')
        .replace(/```([\s\S]*?)```/g, '<pre class="code-block" style="background:#1e2329; color:#fff; padding:16px; border-radius:8px;"><code>$1</code></pre>')
        .replace(/\n\n/g, '</p><p style="margin:12px 0; color:var(--ink); line-height:1.7;">')
        .replace(/\n/g, '<br>');

      const sampleTestsHtml = (activeStep.answer_json?.sample_tests && activeStep.answer_json.sample_tests.length > 0)
        ? `<div class="sample-tests-box" style="margin-top:20px;">
            <div style="font-weight:700; margin-bottom:8px; font-size:13px; color:var(--ink);">Примеры входных и выходных данных:</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              ${activeStep.answer_json.sample_tests.map((st, i) => `
                <div style="background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:12px;">
                  <div style="font-size:11px; font-weight:700; color:var(--muted); margin-bottom:4px;">Пример #${i + 1}</div>
                  <div style="font-size:12px; font-family:monospace; margin-bottom:6px;"><strong>Ввод:</strong> ${escapeHtml(st.input || '(пусто)')}</div>
                  <div style="font-size:12px; font-family:monospace; color:#3b82f6;"><strong>Вывод:</strong> ${escapeHtml(st.output || st.expected || '')}</div>
                </div>
              `).join('')}
            </div>
          </div>` : '';

      const criteria = activeStep.answer_json?.criteria;

      const criteriaHtml = criteria && (typeof criteria === 'string' ? criteria.length : Array.isArray(criteria) && criteria.length)
        ? `<div class="criteria-box" style="margin-top:20px;">
            <div class="criteria-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Критерии оценивания экспертом (куратором):
            </div>
            ${typeof criteria === 'string' ? `<div class="criteria-item">${escapeHtml(criteria)}</div>` : criteria.map(crit => `
              <div class="criteria-item">
                <span style="font-weight:700; color:#2e6018;">[+${escapeHtml(crit.points)} б]</span>
                <span><strong>${escapeHtml(crit.name)}:</strong> ${escapeHtml(crit.desc)}</span>
              </div>
            `).join('')}
          </div>` : '';

      const currentIdx = modTasks.findIndex(t => t.id === activeStep.id);
      const prevStep = currentIdx > 0 ? modTasks[currentIdx - 1] : null;
      const nextStep = currentIdx < modTasks.length - 1 ? modTasks[currentIdx + 1] : null;

      lessonMain.innerHTML = `
        <div class="step-detail-card">
          <p class="eyebrow" style="color:var(--accent-lime); margin-bottom:4px;">
            Шаг ${escapeHtml(stepNum)} · ${escapeHtml(stepTypeName)} · ${escapeHtml(checkTypeLabel)}
          </p>
          <h2 style="margin:0 0 16px; font:700 28px var(--display); color:var(--ink);">
            ${escapeHtml(activeStep.title || 'Урок')}
          </h2>
          
          <div style="margin: 18px 0; font-size:15px; color:var(--ink); line-height:1.7;">
            <p style="margin:12px 0; line-height:1.7;">${descFormatted}</p>
          </div>

          ${sampleTestsHtml}
          ${criteriaHtml}

          <div class="step-actions-bar">
            <div>
              ${prevStep ? `
                <button class="button button-soft" id="btn-prev-step" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Предыдущий шаг
                </button>
              ` : `<span></span>`}
            </div>

            <div style="display:flex; gap:10px; align-items:center;">
              <a class="button button-dark" href="tasks.html?course=${courseId}&task=${activeStep.id}" style="font-size:13px; font-weight:700; padding:10px 22px;">
                Приступить к заданию
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle; margin-left:4px;"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
              </a>
              ${nextStep ? `
                <button class="button button-soft" id="btn-next-step" type="button">
                  Следующий шаг <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-prev-step')?.addEventListener('click', () => {
        if (prevStep) {
          activeStep = prevStep;
          renderSidebar();
          renderStepDetail();
        }
      });

      document.getElementById('btn-next-step')?.addEventListener('click', () => {
        if (nextStep) {
          activeStep = nextStep;
          renderSidebar();
          renderStepDetail();
        }
      });
    };

    renderModuleSwitcher();
    renderSidebar();
    renderStepDetail();
  });
}

function updateCourseLinks(courseId) {
  if (!courseId) return;

  document.querySelectorAll('a[href^="lessons.html"], a[href^="tasks.html"], a[href^="index.html"]').forEach(link => {
    const url = new URL(link.getAttribute('href'), window.location.href);
    url.searchParams.set('course', courseId);
    link.setAttribute('href', url.pathname + url.search);
  });
}

updateCourseLinks(new URLSearchParams(window.location.search).get('course') || localStorage.getItem('pixelstart_active_course'));

document.querySelectorAll('[data-course-filter]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-course-filter]').forEach(item => {
      item.classList.toggle('active', item === button);
    });
    
    document.querySelectorAll('[data-course-type]').forEach(card => {
      card.hidden = button.dataset.courseFilter !== 'all' && card.dataset.courseType !== button.dataset.courseFilter;
    });
  });
});
