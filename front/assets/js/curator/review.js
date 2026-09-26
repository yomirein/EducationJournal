function initCuratorReview() {
  const pageHead = document.querySelector('.curator-theme .page-head');

  if (!pageHead || !window.location.pathname.includes('review.html')) return;

  const content = document.querySelector('.main .content');

  if (!content) return;

  let boardSection = document.querySelector('#submissions-board-section');

  if (!boardSection) {
    boardSection = document.createElement('section');
    boardSection.id = 'submissions-board-section';
    boardSection.className = 'card';
    boardSection.style.marginBottom = '22px';

    const firstCard = content.querySelector('.card');

    if (firstCard) content.insertBefore(boardSection, firstCard);
    else content.appendChild(boardSection);
  }

  let reviewModal = document.querySelector('.review-modal');

  if (!reviewModal) {
    reviewModal = document.createElement('div');
    reviewModal.className = 'review-modal';

    reviewModal.innerHTML = `
      <div class="review-modal-box">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <h2 style="margin:0; font-size:20px;">Проверка работы ученика</h2>
          <button class="button button-soft close-modal-btn" style="min-height:32px; padding:0 10px; display:inline-flex; align-items:center; justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="modal-sub-details" style="font-size:13px; color:var(--muted); line-height:1.5;"></div>
        
        <!-- Curator Secret Box: Criteria & Reference Solution -->
        <div id="modal-curator-secret-box" style="margin:12px 0;"></div>

        <div style="font-weight:700; font-size:12px; text-transform:uppercase; color:var(--muted); margin:12px 0 6px;">Решение ученика:</div>
        <div class="code-viewer-box" style="max-height:220px; overflow-y:auto;"></div>

        <div style="margin-top:14px;">
          <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">Быстрая оценка:</label>
          <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
            <button class="button button-lime grade-preset-btn" data-score="100">100 Отлично</button>
            <button class="button button-soft grade-preset-btn" data-score="90">90 Хорошо</button>
            <button class="button button-soft grade-preset-btn" data-score="75">75 Зачёт</button>
            <button class="button button-danger grade-preset-btn" data-score="40">40 На доработку</button>
          </div>
          <div class="preset-chips">
            <span class="chip" data-text="Отличный проект! Все требования паспорта шага полностью соблюдены.">Идеальный проект</span>
            <span class="chip" data-text="Работа принята. Логика программы и циклы выстроены верно.">Всё верно</span>
            <span class="chip" data-text="Решение работает, но обрати внимание на сокращение дублирования через циклы.">Оптимизируй циклом</span>
            <span class="chip" data-text="Нужно доработать: проверь граничные условия и диапазон координат.">Доработай условия</span>
          </div>
          <div class="field" style="margin-top:10px;">
            <label for="modal-feedback-text">Комментарий куратора:</label>
            <textarea id="modal-feedback-text" class="task-answer" style="height:70px;" placeholder="Напишите обратную связь ученику..."></textarea>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:14px;">
            <button class="button button-soft close-modal-btn">Отмена</button>
            <button class="button button-dark submit-grade-modal-btn">Сохранить оценку</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(reviewModal);

    reviewModal.querySelectorAll('.close-modal-btn').forEach(b => {
      b.addEventListener('click', () => reviewModal.classList.remove('visible'));
    });

    reviewModal.addEventListener('click', e => {
      if (e.target === reviewModal) reviewModal.classList.remove('visible');
    });
  }

  // Filters survive refreshes, so grading a work does not reset the curator's view.
  let currentStatusFilter = 'all';
  let currentStreamFilter = 'all';

  window.refreshCuratorReview = async () => {
    const [submissions, streams] = await Promise.all([
      api.get('/streams/my/submissions'),
      api.get('/users/me/streams')
    ]);

    // grade -1 means "waiting for the curator"; any other value is already graded (0 included).
    const isPending = sub => sub.grade === -1;
    const pendingCount = submissions.filter(isPending).length;
    const gradedCount = submissions.length - pendingCount;

    boardSection.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
        <div>
          <p class="eyebrow" style="margin-bottom:4px;">Панель куратора · Мультипоточная сводка</p>
          <h2 style="margin:0;">Очередь проверки (${submissions.length})</h2>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <span class="status status-review">Требуют оценки: ${pendingCount}</span>
          <span class="status status-done">Проверено: ${gradedCount}</span>
        </div>
      </div>
      <div class="submissions-toolbar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div class="filter-pills" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button class="chip-toggle ${currentStatusFilter === 'all' ? 'active' : ''}" data-sub-filter="all">Все (${submissions.length})</button>
          <button class="chip-toggle ${currentStatusFilter === 'pending' ? 'active' : ''}" data-sub-filter="pending">На проверке (${pendingCount})</button>
          <button class="chip-toggle ${currentStatusFilter === 'graded' ? 'active' : ''}" data-sub-filter="graded">Проверенные (${gradedCount})</button>
          ${streams.length > 0 ? `
            <select id="curator-stream-filter" class="task-answer" style="width:auto; min-width:180px; padding:4px 10px; font-size:12px; height:34px; min-height:0; border-radius:6px; margin:0;">
              <option value="all">Все потоки (${streams.length})</option>
              ${streams.map(st => `<option value="${Number(st.stream_id)}" ${String(st.stream_id) === String(currentStreamFilter) ? 'selected' : ''}>${escapeHtml(st.stream_name)}</option>`).join('')}
            </select>
          ` : ''}
        </div>
        <button class="button button-soft" id="refresh-subs-btn" style="min-height:34px; padding:0 14px; font-size:12px;">Обновить список</button>
      </div>
      <div class="submissions-grid" data-submissions-grid style="margin-top:14px;"></div>
    `;

    boardSection.querySelector('#refresh-subs-btn')?.addEventListener('click', () => run(window.refreshCuratorReview, 'Очередь обновлена.'));

    const grid = boardSection.querySelector('[data-submissions-grid]');

    const renderGrid = () => {
      const filtered = submissions.filter(s => {
        const matchesStatus = 
          currentStatusFilter === 'pending' ? isPending(s) :
          currentStatusFilter === 'graded' ? !isPending(s) : true;

        const matchesStream = 
          currentStreamFilter === 'all' || String(s.stream_id) === String(currentStreamFilter);

        return matchesStatus && matchesStream;
      });

      if (filtered.length === 0) {
        grid.innerHTML = '<p style="color:var(--muted); padding:24px 0; text-align:center;">Нет решений в выбранной выборке.</p>';

        return;
      }

      grid.innerHTML = filtered.map(sub => {
        const isGraded = !isPending(sub);

        const statusBadge = isGraded 
          ? `<span class="status ${isPassedSubmission(sub) ? 'status-done' : 'status-failed'} sub-grade" title="Оценка">${Number(sub.grade)} / 100</span>`
          : '<span class="status status-review sub-grade">На проверке</span>';
        
        const initials = (sub.student_name || 'Ученик').split(' ').map(n => n[0]).join('').slice(0, 2);

        return `
          <div class="submission-item" data-submission-id="${sub.id}">
            <div>
              <div class="sub-header">
                <div class="student-badge-wrap">
                  <div class="avatar-circle">${escapeHtml(initials)}</div>
                  <div class="sub-student">
                    <strong>${escapeHtml(sub.student_name || sub.student_username)}</strong>
                    <span title="${escapeHtml(sub.stream_name || '')}">${escapeHtml(sub.stream_name || `Поток #${sub.stream_id}`)}</span>
                  </div>
                </div>
                ${statusBadge}
              </div>
              <p style="font-size:13px; font-weight:700; margin:10px 0 4px; color:var(--ink);">
                ${sub.step_number ? `Шаг ${escapeHtml(sub.step_number)}. ` : ''}${escapeHtml(sub.task_title || `Задание #${sub.task_id}`)}
              </p>
              <div class="sub-code-preview">${escapeHtml(sub.input || 'Нет текста')}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; font-size:12px;">
              <span style="color:var(--muted)">${sub.feedback_message ? 'Отзыв: ' + escapeHtml(sub.feedback_message.slice(0, 32)) + '...' : 'Без отзыва'}</span>
              <button class="button button-soft" style="min-height:30px; padding:0 12px; font-size:11px;">Оценить</button>
            </div>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('.submission-item').forEach(item => {
        item.addEventListener('click', () => {
          const subId = Number(item.dataset.submissionId);
          const sub = submissions.find(s => s.id === subId);

          if (!sub) return;

          // Pre-fill the file removal form below the board with the opened submission.
          const fRemStream = document.getElementById('remove-stream');
          const fRemTask = document.getElementById('remove-task');
          const fRemSub = document.getElementById('remove-submission');

          if (fRemStream) fRemStream.value = sub.stream_id;
          if (fRemTask) fRemTask.value = sub.task_id;
          if (fRemSub) fRemSub.value = sub.id;

          reviewModal.querySelector('.modal-sub-details').innerHTML = `
            <strong>Ученик:</strong> ${escapeHtml(sub.student_name)} (${escapeHtml(sub.student_email)})<br>
            <strong>Поток:</strong> ${escapeHtml(sub.stream_name || `Поток #${sub.stream_id}`)}<br>
            <strong>Шаг ${escapeHtml(sub.step_number || sub.task_id)}:</strong> ${escapeHtml(sub.task_title || sub.task_description || 'Задание')} · 
            <span style="text-transform:uppercase; font-size:11px; font-weight:700; color:var(--ink);">${escapeHtml(sub.task_type || '')}</span>
          `;

          const secretBox = reviewModal.querySelector('#modal-curator-secret-box');
          let secretHtml = '';

          if (sub.criteria) {
            secretHtml += `
              <div class="criteria-note">
                <strong style="display:block; margin-bottom:3px;">Критерии приёмки кейса (для куратора):</strong>
                <span>${escapeHtml(sub.criteria)}</span>
              </div>
            `;
          }

          if (sub.reference_solution) {
            secretHtml += `
              <div style="background:#0e1411; border:1px solid #233a2d; border-radius:8px; padding:10px 14px; margin-bottom:8px; font-size:12px;">
                <strong style="color:#b8f34a; display:block; margin-bottom:3px;">Эталонное решение (для куратора):</strong>
                <pre style="margin:0; font-family:monospace; color:#a3c6b2; white-space:pre-wrap;">${escapeHtml(sub.reference_solution)}</pre>
              </div>
            `;
          }

          secretBox.innerHTML = secretHtml;

          const codeViewer = reviewModal.querySelector('.code-viewer-box');
          codeViewer.textContent = sub.input || '// Нет текста';

          let linkHelper = reviewModal.querySelector('#modal-link-helper');

          if (!linkHelper) {
            linkHelper = document.createElement('div');
            linkHelper.id = 'modal-link-helper';
            linkHelper.style.marginTop = '6px';
            codeViewer.parentNode.insertBefore(linkHelper, codeViewer.nextSibling);
          }

          const urlMatch = (sub.input || '').match(/https?:\/\/[^\s]+/g);

          if (urlMatch && urlMatch.length > 0) {
            linkHelper.innerHTML = urlMatch.map(url => `
              <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="button button-soft" style="min-height:28px; padding:0 10px; font-size:11px; display:inline-flex; align-items:center; gap:6px; margin-right:6px; margin-top:4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span>Открыть проект (${escapeHtml(url.slice(0, 32))}...)</span>
              </a>
            `).join('');
          } else {
            linkHelper.innerHTML = '';
          }

          let testHelper = reviewModal.querySelector('#modal-test-helper');

          if (!testHelper) {
            testHelper = document.createElement('div');
            testHelper.id = 'modal-test-helper';
            testHelper.style.marginTop = '8px';
            linkHelper.parentNode.insertBefore(testHelper, linkHelper.nextSibling);
          }

          if (sub.task_type === 'code_test') {
            testHelper.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <button class="button button-soft" id="btn-modal-rerun" type="button" style="min-height:30px; font-size:12px; display:inline-flex; align-items:center; gap:6px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <span>Прогнать тесты на сервере</span>
                </button>
                <span id="modal-test-verdict" style="font-size:12px; font-weight:700;"></span>
              </div>
              <div id="modal-test-console-box" style="display:none; margin-top:8px; background:#070a0e; border:1px solid #1e293b; border-radius:6px; padding:10px; font-family:monospace; font-size:11px; max-height:140px; overflow-y:auto;"></div>
            `;

            const rerunBtn = testHelper.querySelector('#btn-modal-rerun');
            const verdictSpan = testHelper.querySelector('#modal-test-verdict');
            const consoleBox = testHelper.querySelector('#modal-test-console-box');

            rerunBtn.onclick = async () => {
              verdictSpan.textContent = 'Тестирование...';
              verdictSpan.style.color = 'var(--muted)';
              consoleBox.style.display = 'block';
              consoleBox.innerHTML = '<div style="color:#888;">[RUN] Запуск тестового стенда жюри...</div>';

              try {
                const runRes = await api.post(`/courses/${sub.course_id}/tasks/${sub.task_id}/run-tests`, { input: sub.input || '' });

                consoleBox.innerHTML = '';

                if (runRes.test_details && runRes.test_details.length > 0) {
                  runRes.test_details.forEach(td => {
                    const col = td.status === 'OK' ? '#7ee787' : '#ff7b72';

                    consoleBox.innerHTML += `<div style="color:${col};">[${td.status}] Тест #${td.num} (${td.visibility}): ${escapeHtml(td.message)} [${td.duration_ms} мс]</div>`;
                  });
                }

                verdictSpan.textContent = `Результат: ${runRes.grade} / 100 баллов`;
                verdictSpan.style.color = runRes.grade === 100 ? '#7ee787' : '#ff7b72';

                if (runRes.grade === 100) {
                  selectedScore = 100;

                  reviewModal.querySelectorAll('.grade-preset-btn').forEach(b => {
                    b.classList.toggle('button-lime', Number(b.dataset.score) === 100);
                    b.classList.toggle('button-soft', Number(b.dataset.score) !== 100);
                  });
                }
              } catch (e) {
                consoleBox.innerHTML += `<div style="color:#ff7b72;">Ошибка: ${escapeHtml(e.message)}</div>`;
                verdictSpan.textContent = 'Ошибка запуска';
              }
            };
          } else {
            testHelper.innerHTML = '';
          }

          let simHelper = reviewModal.querySelector('#modal-sim-helper');

          if (!simHelper) {
            simHelper = document.createElement('div');
            simHelper.id = 'modal-sim-helper';
            simHelper.style.marginTop = '8px';
            testHelper.parentNode.insertBefore(simHelper, testHelper.nextSibling);
          }

          const isScratchSub = sub.task_type === 'scratch' || (sub.input && sub.input.toLowerCase().includes('scratch'));
          const isMinecraftSub = sub.task_type === 'minecraft_edu' || (sub.input && (sub.input.toLowerCase().includes('кумир') || sub.input.toLowerCase().includes('makecode')));

          if (isScratchSub) {
            simHelper.innerHTML = `
              <div style="margin-top:8px;">
                <button class="button button-soft" id="btn-modal-scratch-preview" type="button" style="min-height:30px; font-size:12px; display:inline-flex; align-items:center; gap:6px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span>Запустить проект в симуляторе Scratch 3.0</span>
                </button>
                <div id="modal-scratch-frame-box" style="display:none; margin-top:8px; border:1px solid #1e293b; border-radius:8px; overflow:hidden;">
                  <iframe src="/simulators/scratch-ru/embed.html" style="width:100%; height:380px; border:none; display:block;"></iframe>
                </div>
              </div>
            `;

            const scratchBtn = simHelper.querySelector('#btn-modal-scratch-preview');
            const scratchBox = simHelper.querySelector('#modal-scratch-frame-box');

            scratchBtn.onclick = () => {
              scratchBox.style.display = scratchBox.style.display === 'none' ? 'block' : 'none';
            };
          } else if (isMinecraftSub) {
            simHelper.innerHTML = `
              <div style="margin-top:8px;">
                <button class="button button-soft" id="btn-modal-kumir-preview" type="button" style="min-height:30px; font-size:12px; display:inline-flex; align-items:center; gap:6px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                  <span>Запустить проект в симуляторе Кумир-Крафт</span>
                </button>
                <div id="modal-kumir-frame-box" style="display:none; margin-top:8px; border:1px solid #1e293b; border-radius:8px; overflow:hidden;">
                  <iframe src="/simulators/kumir-craft/index.html?lang=ru" style="width:100%; height:380px; border:none; display:block;"></iframe>
                </div>
              </div>
            `;

            const kumirBtn = simHelper.querySelector('#btn-modal-kumir-preview');
            const kumirBox = simHelper.querySelector('#modal-kumir-frame-box');

            kumirBtn.onclick = () => {
              kumirBox.style.display = kumirBox.style.display === 'none' ? 'block' : 'none';
            };
          } else {
            simHelper.innerHTML = '';
          }
          
          const modalText = reviewModal.querySelector('#modal-feedback-text');
          modalText.value = sub.feedback_message || 'Отличная работа! Все критерии выполнены.';

          let selectedScore = isPending(sub) ? 100 : sub.grade;

          reviewModal.querySelectorAll('.grade-preset-btn').forEach(btn => {
            btn.classList.toggle('button-lime', Number(btn.dataset.score) === selectedScore);
            btn.classList.toggle('button-soft', Number(btn.dataset.score) !== selectedScore);

            btn.onclick = () => {
              selectedScore = Number(btn.dataset.score);

              reviewModal.querySelectorAll('.grade-preset-btn').forEach(b => {
                b.classList.toggle('button-lime', b === btn);
                b.classList.toggle('button-soft', b !== btn);
              });
            };
          });

          reviewModal.querySelectorAll('.chip').forEach(chip => {
            chip.onclick = () => {
              modalText.value = chip.dataset.text;
            };
          });

          const submitBtn = reviewModal.querySelector('.submit-grade-modal-btn');
          submitBtn.onclick = async () => {
            try {
              submitBtn.textContent = 'Сохранение...';

              await api.patch(`/streams/${sub.stream_id}/tasks/${sub.task_id}/submissions/${sub.id}`, {
                grade: selectedScore,
                feedback_message: modalText.value
              });

              reviewModal.classList.remove('visible');
              showMessage(`Оценка ${selectedScore} сохранена для ${sub.student_name}`);
              window.refreshCuratorReview();
            } catch (err) {
              showMessage('Ошибка сохранения: ' + err.message, true);
            } finally {
              submitBtn.textContent = 'Сохранить оценку';
            }
          };

          reviewModal.classList.add('visible');
        });
      });
    };

    boardSection.querySelectorAll('[data-sub-filter]').forEach(pill => {
      pill.addEventListener('click', () => {
        boardSection.querySelectorAll('[data-sub-filter]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentStatusFilter = pill.dataset.subFilter;
        renderGrid();
      });
    });

    const streamSelect = boardSection.querySelector('#curator-stream-filter');

    if (streamSelect) {
      streamSelect.addEventListener('change', () => {
        currentStreamFilter = streamSelect.value;
        renderGrid();
      });
    }

    renderGrid();
  };

  registerLoader(window.refreshCuratorReview);
}

document.addEventListener('DOMContentLoaded', initCuratorReview);
