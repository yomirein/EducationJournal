function initStudentSchedulePage() {
  const mount = document.getElementById('schedule-items-container');

  if (!mount) return;

  api.get('/users/me/schedule/calendar').catch(() => api.get('/users/me/schedule')).then(rawItems => {
    let items = [];

    if (rawItems && Array.isArray(rawItems)) {
      if (rawItems.length > 0 && rawItems[0].lessons) {
        rawItems.forEach(s => {
          (s.lessons || []).forEach(l => {
            items.push({
              ...l,
              stream_id: s.stream_id,
              stream_name: s.stream_name,
              course_id: s.course_id,
              course_title: s.course_title,
              curator_name: s.curator_name
            });
          });
        });
      } else {
        items = rawItems;
      }
    }

    if (!items || items.length === 0) {
      mount.innerHTML = `
        <div class="card" style="padding:48px; text-align:center; color:var(--muted);">
          <p style="font-size:16px; font-weight:700; margin-bottom:8px;">Учебный маршрут пока пуст</p>
          <p style="font-size:13px;">После зачисления в курс здесь появятся его уроки.</p>
        </div>
      `;

      return;
    }

    let activeFilter = 'all';

    const getStatusCategory = (it) => {
      const tasksTotal = it.tasks_count || 1;
      const tasksDone = it.tasks_completed || 0;

      if (it.status === 'COMPLETED' || (tasksTotal > 0 && tasksDone >= tasksTotal)) return 'completed';
      if (tasksDone > 0 || it.status === 'ACTIVE') return 'active';

      return 'upcoming';
    };

    const updateCounts = () => {
      const counts = {
        all: items.length,
        active: items.filter(it => getStatusCategory(it) === 'active').length,
        completed: items.filter(it => getStatusCategory(it) === 'completed').length,
        upcoming: items.filter(it => getStatusCategory(it) === 'upcoming').length,
      };

      const cAll = document.getElementById('count-all');
      const cActive = document.getElementById('count-active');
      const cComp = document.getElementById('count-completed');
      const cUp = document.getElementById('count-upcoming');

      if (cAll) cAll.textContent = counts.all;
      if (cActive) cActive.textContent = counts.active;
      if (cComp) cComp.textContent = counts.completed;
      if (cUp) cUp.textContent = counts.upcoming;
    };

    const renderList = () => {
      const filtered = items.filter(it => {
        if (activeFilter === 'all') return true;

        return getStatusCategory(it) === activeFilter;
      });

      if (filtered.length === 0) {
        mount.innerHTML = `
          <div class="card" style="padding:40px; text-align:center; color:var(--muted);">
            В выбранной вкладке нет занятий.
          </div>
        `;

        return;
      }

      mount.innerHTML = filtered.map(item => {
        const cat = getStatusCategory(item);
        const tasksTotal = item.tasks_count || 1;
        const tasksDone = item.tasks_completed || 0;
        const progressPct = Math.round((tasksDone / tasksTotal) * 100);

        let badgeHtml = '';

        if (cat === 'completed') {
          badgeHtml = `<span class="status status-done">Сдано (100%)</span>`;
        } else if (cat === 'active') {
          badgeHtml = `<span class="status status-review"><span class="ticker-ping" style="margin-right:6px;"></span>В процессе (${progressPct}%)</span>`;
        } else {
          badgeHtml = `<span class="status status-progress">Предстоит</span>`;
        }

        const deadlineStr = item.deadline ? new Date(item.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : `Урок ${Number(item.lesson_number || 1)}`;
        const taskLink = item.action_url || `course/lessons.html?course=${Number(item.course_id || 0)}`;

        return `
          <div class="card schedule-card-row ${cat}">
            <div class="schedule-time-col">
              <span class="schedule-date-badge">${escapeHtml(deadlineStr)}</span>
              <span class="schedule-time-label">${escapeHtml(item.time_slot || 'Дата не назначена')}</span>
            </div>
            <div class="schedule-info-col">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                <span class="schedule-stream-pill">${escapeHtml(item.stream_name || 'Поток')}</span>
                <span style="font-size:11px; color:var(--muted);">${escapeHtml(item.module_name || 'Модуль 1')}</span>
              </div>
              <div class="schedule-lesson-title">${escapeHtml(item.lesson_title || item.title || 'Урок')}</div>
              <div class="schedule-progress-bar-wrap">
                <div class="schedule-progress-bar-fill" style="width:${cat === 'completed' ? 100 : progressPct}%;"></div>
              </div>
              <div class="schedule-card-meta" style="font-size:11px; color:var(--muted); display:flex; justify-content:space-between; margin-top:4px;">
                <span>Выполнено: ${tasksDone} из ${tasksTotal} ${plural(tasksTotal, 'шага', 'шагов', 'шагов')}</span>
                <span>Куратор: ${escapeHtml(item.curator_name || 'Не назначен')}</span>
              </div>
            </div>
            <div class="schedule-action-col">
              ${badgeHtml}
              <a class="button ${cat === 'active' ? 'button-lime' : 'button-soft'}" style="min-height:36px; padding:0 14px; font-size:12px; font-weight:700;" href="${safeHref(taskLink)}">
                В Студию
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle; margin-left:4px;"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
            </div>
          </div>
        `;
      }).join('');
    };

    updateCounts();
    renderList();

    const tabsBar = document.getElementById('schedule-tabs');

    if (tabsBar) {
      tabsBar.querySelectorAll('.chip-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          tabsBar.querySelectorAll('.chip-toggle').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeFilter = btn.dataset.filter || 'all';
          renderList();
        });
      });
    }
  }).catch(err => {
    mount.innerHTML = `<div class="card" style="padding:32px; color:var(--danger); text-align:center;">Не удалось загрузить расписание: ${escapeHtml(err.message)}</div>`;
  });
}

document.addEventListener('DOMContentLoaded', initStudentSchedulePage);
