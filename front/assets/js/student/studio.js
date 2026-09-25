function initTasksPage() {
  const taskPage = document.querySelector('.task-page');
  const studioRoot = document.getElementById('studio-tablet-root');

  if (!taskPage && !studioRoot) return;

  const urlParams = new URLSearchParams(window.location.search);
  let requestedTaskId = urlParams.get('task') ? Number(urlParams.get('task')) : null;

  run(async () => {
    const courseId = await resolveCourseId();

    if (!urlParams.get('course')) {
      const curUrl = new URL(window.location.href);
      curUrl.searchParams.set('course', courseId);

      if (requestedTaskId) curUrl.searchParams.set('task', requestedTaskId);

      window.history.replaceState(null, '', curUrl.toString());
    }

    const tasks = await loadCourseTasks(courseId, taskPage);

    if (!tasks) return;
    if (!tasks.length) throw new Error('В этом курсе пока нет заданий.');

    let currentTask = tasks.find(t => t.id === requestedTaskId) || tasks[0];

    let stepperWrap = document.querySelector('[data-task-stepper-container]') || document.querySelector('[data-task-stepper]');

    if (!stepperWrap) {
      stepperWrap = document.createElement('div');
      stepperWrap.className = 'studio-stepper-wrap';
      stepperWrap.setAttribute('data-task-stepper-container', 'true');
      taskPage?.prepend(stepperWrap);
    }

    const bodyContainer = document.getElementById('studio-body-container');
    const viewToggles = document.getElementById('studio-view-toggles');
    const fullscreenBtn = document.getElementById('studio-fullscreen-btn');

    if (viewToggles && bodyContainer) {
      viewToggles.querySelectorAll('[data-view-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.viewMode;

          viewToggles.querySelectorAll('[data-view-mode]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          bodyContainer.className = `studio-body mode-${mode}`;
        });
      });
    }

    if (fullscreenBtn && studioRoot) {
      fullscreenBtn.addEventListener('click', () => {
        studioRoot.classList.toggle('is-fullscreen');
        fullscreenBtn.classList.toggle('active', studioRoot.classList.contains('is-fullscreen'));
      });

      window.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === '[') {
          e.preventDefault();
          document.getElementById('btn-prev-step')?.click();
        } else if (e.altKey && e.key === ']') {
          e.preventDefault();
          document.getElementById('btn-next-step')?.click();
        } else if (e.altKey && (e.key === 'f' || e.key === 'F')) {
          e.preventDefault();
          fullscreenBtn.click();
        }
      });
    }

    // Saves an answer and re-renders the step so its grade badge and the stepper are current.
    // workbench: false keeps the right pane (console log, Scratch/Minecraft iframe) untouched.
    const submitAnswer = async (task, input, { workbench = true } = {}) => {
      const result = await api.post(`/courses/${courseId}/tasks/${task.id}/submissions`, { input });

      await renderTask(task, { workbench });
      renderStepper();

      return result;
    };

    const workbenchTitleText = document.getElementById('workbench-title-text');
    const workbenchBadge = document.getElementById('workbench-badge');
    const workbenchReloadBtn = document.getElementById('workbench-reload-btn');
    const workbenchMount = document.getElementById('workbench-content-mount');
    const scratchExpandBtn = document.getElementById('scratch-expand-btn');
    let scratchViewSnapshot = null;

    const restoreScratchView = () => {
      if (!scratchViewSnapshot) return;

      studioRoot.classList.remove('scratch-expanded');
      studioRoot.classList.toggle('is-fullscreen', scratchViewSnapshot.fullscreen);
      fullscreenBtn?.classList.toggle('active', scratchViewSnapshot.fullscreen);
      bodyContainer.className = `studio-body mode-${scratchViewSnapshot.mode}`;
      viewToggles?.querySelectorAll('[data-view-mode]').forEach(button => button.classList.toggle('active', button.dataset.viewMode === scratchViewSnapshot.mode));
      scratchViewSnapshot = null;
      scratchExpandBtn.textContent = 'Развернуть Scratch';
      scratchExpandBtn.setAttribute('aria-expanded', 'false');
    };

    scratchExpandBtn?.addEventListener('click', () => {
      if (scratchViewSnapshot) return restoreScratchView();

      scratchViewSnapshot = {
        fullscreen: studioRoot.classList.contains('is-fullscreen'),
        mode: bodyContainer.className.match(/mode-(split|info|workbench)/)?.[1] || 'split'
      };

      studioRoot.classList.add('is-fullscreen', 'scratch-expanded');
      fullscreenBtn?.classList.add('active');
      bodyContainer.className = 'studio-body mode-workbench';
      viewToggles?.querySelectorAll('[data-view-mode]').forEach(button => button.classList.toggle('active', button.dataset.viewMode === 'workbench'));
      scratchExpandBtn.textContent = 'Свернуть Scratch';
      scratchExpandBtn.setAttribute('aria-expanded', 'true');
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && scratchViewSnapshot) restoreScratchView();
    });

    if (workbenchReloadBtn) {
      workbenchReloadBtn.onclick = () => {
        renderWorkbench(currentTask);
        showMessage('Интерактивная среда перезагружена');
      };
    }

    const updateFooterNav = () => {
      const footer = document.querySelector('.tablet-footer');

      if (!footer) return;

      const currentIdx = tasks.findIndex(t => t.id === currentTask.id);

      footer.innerHTML = `
        <button class="button button-soft" id="btn-prev-step" type="button" ${currentIdx === 0 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Предыдущий шаг
        </button>
        <span id="step-footer-counter" style="font-size:12px; color:var(--muted); font-weight:700;">
          Шаг ${currentIdx + 1} из ${tasks.length}
        </span>
        <button class="button button-soft" id="btn-next-step" type="button" ${currentIdx === tasks.length - 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
          Следующий шаг
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
        </button>
      `;

      footer.querySelector('#btn-prev-step')?.addEventListener('click', () => {
        if (currentIdx > 0) {
          currentTask = tasks[currentIdx - 1];
          renderTask(currentTask);
          renderStepper();
        }
      });

      footer.querySelector('#btn-next-step')?.addEventListener('click', () => {
        if (currentIdx < tasks.length - 1) {
          currentTask = tasks[currentIdx + 1];
          renderTask(currentTask);
          renderStepper();
        }
      });
    };

    const renderStepper = () => {
      stepperWrap.innerHTML = `
        <div class="task-stepper">
          ${tasks.map((t, idx) => {
            const stepNum = t.step_number || String(idx + 1).padStart(2, '0');
            const isActive = t.id === currentTask.id;
            const icon = stepIcon(t.type);
            const typeName = stepLabel(t.type);
            return `<button class="task-step-btn ${isActive ? 'active' : ''}" data-step-task="${t.id}" title="${escapeHtml(t.title || '')}">
              <span style="opacity:0.75; font-size:10px;">${icon}</span>
              <span>${escapeHtml(stepNum)}</span>
              <span style="font-weight:400; font-size:11px;">${escapeHtml(typeName)}</span>
            </button>`;
          }).join('')}
        </div>
      `;

      stepperWrap.querySelectorAll('[data-step-task]').forEach(btn => {
        btn.addEventListener('click', () => {
          const tid = Number(btn.dataset.stepTask);

          currentTask = tasks.find(t => t.id === tid) || tasks[0];
          renderTask(currentTask);
          renderStepper();
        });
      });

      setTimeout(() => {
        const scroller = stepperWrap.querySelector('.task-stepper');
        const activeStep = scroller?.querySelector('.task-step-btn.active');

        if (scroller && activeStep) {
          scroller.scrollTo({
            left: activeStep.offsetLeft - scroller.offsetLeft - (scroller.clientWidth - activeStep.clientWidth) / 2,
            behavior: 'smooth'
          });
        }
      }, 50);
    };

    const renderWorkbench = async (task) => {
      if (!workbenchMount) return;

      if (task.type !== 'scratch') restoreScratchView();
      if (scratchExpandBtn) scratchExpandBtn.hidden = task.type !== 'scratch';

      workbenchMount.innerHTML = '';

      const meta = task.answer_json || {};
      const stepType = task.type || 'theory';

      if (stepType === 'scratch') {
        if (workbenchTitleText) workbenchTitleText.innerHTML = `Scratch 3.0 · Блочная лаборатория`;
        if (workbenchBadge) workbenchBadge.textContent = 'Интерактивно';

        const frameUrl = `/simulators/scratch-ru/embed.html?task=${encodeURIComponent(task.step_number || task.id)}&course=${courseId}&v=5`;

        workbenchMount.innerHTML = `
          <div style="flex:1; display:flex; flex-direction:column; height:100%; position:relative;">
            <iframe class="workbench-iframe" id="scratch-workbench-iframe" src="${frameUrl}"></iframe>
          </div>
        `;

        const iframe = workbenchMount.querySelector('#scratch-workbench-iframe');
        iframe.onload = () => {
          iframe.contentWindow?.postMessage({
            type: 'SCRATCH_INIT',
            config: {
              taskTitle: task.title,
              taskText: task.description,
              submitMode: /число/i.test(task.submit_type || '') ? 'number' : 'review',
              criteria: meta.criteria
            }
          }, window.location.origin);
        };
      }

      else if (stepType === 'minecraft_edu') {
        if (workbenchTitleText) workbenchTitleText.innerHTML = `Кумир-Крафт 2D · Воксельный мир`;
        if (workbenchBadge) workbenchBadge.textContent = 'Симулятор';

        let lvl = 1;
        const sNum = String(task.step_number || '');
        const sTitle = String(task.title || '').toLowerCase();

        if (sNum === '2.2.3' || sTitle.includes('стен')) lvl = 2;
        else if (sNum === '2.3.3' || sTitle.includes('мост')) lvl = 3;

        const frameUrl = `/simulators/kumir-craft/index.html?level=${lvl}&lang=ru&v=20261024`;

        workbenchMount.innerHTML = `
          <div style="flex:1; display:flex; flex-direction:column; height:100%; position:relative;">
            <iframe class="workbench-iframe" id="kumir-workbench-iframe" src="${frameUrl}"></iframe>
          </div>
        `;
      }

      else if (stepType === 'code_test') {
        if (workbenchTitleText) workbenchTitleText.innerHTML = `Python 3.12 · Песочница с тестами`;
        if (workbenchBadge) workbenchBadge.textContent = 'Автопроверка';

        const sampleTests = meta.sample_tests || [];
        const defaultPySnippet = `# Введите решение. Читайте данные через input(), выводите через print().\n`;

        workbenchMount.innerHTML = `
          <div class="workbench-code-container">
            ${sampleTests.length > 0 ? `
              <div class="sample-tests-box" style="margin:12px; margin-bottom:8px;">
                <div class="sample-tests-header">Примеры тестов (из условия задачи)</div>
                ${sampleTests.map(st => `
                  <div class="sample-test-item">
                    <div class="sample-col">
                      <div class="sample-col-label">Входные данные (stdin):</div>
                      <code class="sample-col-code">${escapeHtml(st.input || '')}</code>
                    </div>
                    <div class="sample-col">
                      <div class="sample-col-label">Ожидаемый ответ (stdout):</div>
                      <code class="sample-col-code">${escapeHtml(st.output || '')}</code>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <div class="code-editor-wrapper" style="flex:1; display:flex; flex-direction:column; border-radius:0; border:none; margin:0 12px 12px;">
              <div class="code-editor-topbar">
                <div class="code-editor-title">
                  <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#7ee787;"></span>
                  <span>solution.py</span>
                  <span style="opacity:0.6; font-size:11px;">Лимит: ${meta.time_limit || '1.0 с'}, Память: ${meta.memory_limit || '256 МБ'}</span>
                </div>
                <button class="button button-soft" id="btn-reset-code" type="button" style="min-height:26px; padding:0 10px; font-size:11px;">
                  Сброс кода
                </button>
              </div>
              <textarea class="code-editor-textarea" id="python-code-input" spellcheck="false" style="flex:1; min-height:220px;">${defaultPySnippet}</textarea>
              <div class="code-actions-bar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <span style="font-size:12px; color:#a4c2b0;">
                  Примеров: ${sampleTests.length}. Остальные тесты скрыты до сдачи.
                </span>
                <div style="display:flex; gap:8px;">
                  <button class="button button-soft" id="btn-dry-run-tests" type="button" style="padding:8px 14px; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    Проверить на примерах
                  </button>
                  <button class="button button-lime" id="btn-run-code-tests" type="button" style="padding:8px 18px; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Сдать решение на оценку
                  </button>
                </div>
              </div>
              <div class="code-test-console" id="code-test-console" style="display:none; max-height:180px;"></div>
            </div>
          </div>
        `;

        const codeArea = workbenchMount.querySelector('#python-code-input');
        const consoleBox = workbenchMount.querySelector('#code-test-console');

        const draftKey = `pixelstart_code_draft_${task.id}`;
        const savedDraft = localStorage.getItem(draftKey);

        if (savedDraft) {
          codeArea.value = savedDraft;
        }

        codeArea.addEventListener('input', () => {
          localStorage.setItem(draftKey, codeArea.value);
        });

        codeArea.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            e.preventDefault();

            const start = codeArea.selectionStart;
            const end = codeArea.selectionEnd;

            codeArea.value = codeArea.value.substring(0, start) + '    ' + codeArea.value.substring(end);
            codeArea.selectionStart = codeArea.selectionEnd = start + 4;
          } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();

            if (e.shiftKey) {
              executeCode(false);
            } else {
              executeCode(true);
            }
          }
        });

        workbenchMount.querySelector('#btn-reset-code').onclick = () => {
          codeArea.value = defaultPySnippet;
          localStorage.removeItem(draftKey);
          showMessage('Код сброшен к начальному шаблону');
        };

        const executeCode = async (isSubmission = false) => {
          const codeVal = codeArea.value.trim();

          if (!codeVal) {
            showMessage('Введите код решения на Python.', true);

            return;
          }

          consoleBox.style.display = 'block';

          consoleBox.innerHTML = `
            <div class="console-line-info">[EXEC] Песочница Python 3.12 запущена... Лимит: ${meta.time_limit || '1.0 с'}</div>
            <div class="console-line-info">[EXEC] Компиляция и запуск тестового набора...</div>
          `;

          try {
            const res = isSubmission
              ? await submitAnswer(task, codeVal, { workbench: false })
              : await api.post(`/courses/${courseId}/tasks/${task.id}/run-tests`, { input: codeVal });

            setTimeout(() => {
              if (res.test_details && res.test_details.length > 0) {
                res.test_details.forEach(td => {
                  if (td.status === 'OK') {
                    if (td.visibility === 'sample') {
                      consoleBox.innerHTML += `<div class="console-line-ok">[PASS] Тест #${td.num} (пример): stdin="${escapeHtml(td.input)}" -> "${escapeHtml(td.actual)}" [${td.duration_ms} мс]</div>`;
                    } else {
                      consoleBox.innerHTML += `<div class="console-line-ok">[PASS] Тест #${td.num} (скрытый тест жюри): OK [${td.duration_ms} мс]</div>`;
                    }
                  } else {
                    if (td.visibility === 'sample') {
                      consoleBox.innerHTML += `<div class="console-line-fail">[FAIL] Тест #${td.num} (${td.status}): stdin="${escapeHtml(td.input)}" | Ожидалось: "${escapeHtml(td.expected)}" | Получено: "${escapeHtml(td.actual)}" [${td.duration_ms} мс]</div>`;
                    } else {
                      consoleBox.innerHTML += `<div class="console-line-fail">[FAIL] Тест #${td.num} (${td.status}): ${escapeHtml(td.message)}</div>`;
                    }
                  }
                });
              }

              if (res.grade === 100) {
                consoleBox.innerHTML += `
                  <div class="console-line-ok" style="font-weight:700; margin-top:8px; border-top:1px solid rgba(0,255,150,0.2); padding-top:6px;">
                    ${isSubmission ? '[ACCEPTED] Полный балл: 100 / 100. Решение зачтено в журнал.' : '[SAMPLES OK] Все открытые примеры пройдены. Скрытые тесты запустятся при сдаче.'}
                  </div>
                `;

                playChime(true);

                if (isSubmission) {
                  triggerCelebration('Тесты пройдены!', 'Задача полностью зачтена: 100 / 100 баллов!', res.grade);
                } else {
                  showMessage('Открытые примеры пройдены. Можно сдавать решение.');
                }
              } else {
                consoleBox.innerHTML += `
                  <div class="console-line-fail" style="font-weight:700; margin-top:8px; border-top:1px solid rgba(255,100,100,0.2); padding-top:6px;">
                    [FAILED] ${isSubmission ? 'Оценка' : 'Примеры'}: ${res.grade} / 100. ${escapeHtml(res.feedback_message || '')}
                  </div>
                `;

                playChime(false);
                showMessage(isSubmission ? 'Тесты не пройдены. Смотрите лог в терминале.' : 'Есть ошибки на тестах. Исправьте код.', true);
              }
            }, 250);

          } catch (e) {
            consoleBox.innerHTML += `<div class="console-line-fail">> Системная ошибка выполнения: ${escapeHtml(e.message)}</div>`;
            playChime(false);
          }
        };

        workbenchMount.querySelector('#btn-dry-run-tests').onclick = () => executeCode(false);
        workbenchMount.querySelector('#btn-run-code-tests').onclick = () => executeCode(true);
      }

      else if (stepType === 'quiz') {
        if (workbenchTitleText) workbenchTitleText.innerHTML = `Контрольный вопрос · Проверка знаний`;
        if (workbenchBadge) workbenchBadge.textContent = 'Тест';

        const options = meta.options || [];
        const isMultiple = meta.is_multiple || false;

        let optionsHtml = '';

        if (options.length > 0) {
          optionsHtml = `
            <p style="font-size:14px; font-weight:700; margin-bottom:14px; color:#d8e5de;">
              ${isMultiple ? 'Варианты ответов (выберите все верные):' : 'Выберите один верный вариант:'}
            </p>
            <div class="quiz-options-list">
              ${options.map((opt, oIdx) => `
                <button class="quiz-option-card ${isMultiple ? 'checkbox' : 'radio'}" type="button" aria-pressed="false" data-opt-idx="${oIdx}" data-opt-val="${escapeHtml(opt)}">
                  <div class="quiz-indicator">
                    <span class="quiz-indicator-dot"></span>
                  </div>
                  <span class="quiz-option-text">${escapeHtml(opt)}</span>
                </button>
              `).join('')}
            </div>
          `;
        } else {
          optionsHtml = `
            <div style="margin:20px 0;">
              <label for="quiz-numeric-input" style="font-size:14px; font-weight:700; display:block; margin-bottom:10px; color:#d8e5de;">
                Введите числовой ответ:
              </label>
              <input type="text" id="quiz-numeric-input" class="task-answer" placeholder="Например: 45" style="max-width:280px; font-size:16px; font-weight:700; padding:12px 16px; background:#1c2520; color:#fff;" />
            </div>
          `;
        }

        workbenchMount.innerHTML = `
          <div class="workbench-quiz-container">
            ${optionsHtml}
            <div style="display:flex; justify-content:flex-end; margin-top:20px;">
              <button class="button button-lime" id="btn-submit-quiz" type="button" style="padding:12px 28px; font-size:13px; font-weight:700;">
                Проверить ответ
              </button>
            </div>
          </div>
        `;

        if (options.length > 0) {
          workbenchMount.querySelectorAll('.quiz-option-card').forEach(card => {
            card.onclick = () => {
              if (isMultiple) {
                card.classList.toggle('selected');
                card.setAttribute('aria-pressed', card.classList.contains('selected') ? 'true' : 'false');
              } else {
                workbenchMount.querySelectorAll('.quiz-option-card').forEach(c => {
                  c.classList.remove('selected');
                  c.setAttribute('aria-pressed', 'false');
                });

                card.classList.add('selected');
                card.setAttribute('aria-pressed', 'true');
              }
            };
          });
        }

        workbenchMount.querySelector('#btn-submit-quiz').onclick = async () => {
          let answerVal = '';

          if (options.length > 0) {
            const selectedCards = workbenchMount.querySelectorAll('.quiz-option-card.selected');

            if (selectedCards.length === 0) {
              showMessage('Пожалуйста, выберите хотя бы один вариант ответа.', true);

              return;
            }

            if (isMultiple) {
              const vals = Array.from(selectedCards).map(c => c.dataset.optVal);

              answerVal = JSON.stringify(vals);
            } else {
              answerVal = selectedCards[0].dataset.optVal;
            }
          } else {
            const numInp = workbenchMount.querySelector('#quiz-numeric-input');

            answerVal = (numInp?.value || '').trim();

            if (!answerVal) {
              showMessage('Пожалуйста, введите ответ числом.', true);

              return;
            }
          }

          try {
            const res = await submitAnswer(task, answerVal);

            if (res.grade === 100) {
              playChime(true);
              triggerCelebration('Верно!', res.feedback_message || 'Ответ абсолютно правильный.', res.grade);
            } else {
              playChime(false);
              showMessage(res.feedback_message || 'Неверный ответ. Попробуйте ещё раз.', true);
            }
          } catch (e) {
            showMessage('Ошибка проверки: ' + e.message, true);
          }
        };
      }

      else if (stepType === 'theory') {
        if (workbenchTitleText) workbenchTitleText.innerHTML = `Теоретический конспект · Изучение`;
        if (workbenchBadge) workbenchBadge.textContent = 'Материал';

        workbenchMount.innerHTML = `
          <div class="workbench-theory-container">
            <div style="background:#16201b; border:1px solid #23352a; border-radius:14px; padding:24px; margin-bottom:20px;">
              <h3 style="margin:0 0 12px; font-size:17px; color:#b8f34a;">Теоретический шаг</h3>
              <p style="font-size:13px; color:#a4b8ad; line-height:1.6; margin-bottom:16px;">
                Прочитайте материал в левой панели и, когда будете готовы, отметьте шаг изученным.
              </p>
            </div>
            <div style="display:flex; justify-content:flex-end;">
              <button class="button button-lime" id="btn-submit-theory" type="button" style="padding:12px 28px; font-size:13px; font-weight:700;">
                Отметить изученным
              </button>
            </div>
          </div>
        `;

        workbenchMount.querySelector('#btn-submit-theory').onclick = async () => {
          try {
            const res = await submitAnswer(task, 'read');

            playChime(true);
            triggerCelebration('Теория пройдена', 'Материал зафиксирован в журнале платформы!', res.grade);
          } catch (e) {
            showMessage('Ошибка: ' + e.message, true);
          }
        };
      }

      else if (stepType === 'project') {
        if (workbenchTitleText) workbenchTitleText.innerHTML = `Проект курса · Приёмка куратором`;
        if (workbenchBadge) workbenchBadge.textContent = 'Ручная проверка';

        workbenchMount.innerHTML = `
          <div class="workbench-quiz-container">
            ${task.step_number === '1.3.3' ? `<div class="capstone-game-link">
              <strong>Игра «Поймай яблоко»</strong>
              <p>Откройте пример с двумя спрайтами, циклом, условием и переменной «счёт». Измените блоки и соберите свой вариант игры.</p>
              <a class="button button-lime" href="/simulators/scratch-ru/index.html?demo=apple_catch" target="_blank" rel="noopener">Открыть игру в Scratch</a>
            </div>` : ''}
            ${criteriaBox(meta.criteria, 'Критерии приёмки проекта (проверяет куратор):')}
            <div class="field" style="margin-bottom:12px;">
              <label for="project-link-input" style="font-size:13px; font-weight:700; display:block; margin-bottom:6px; color:#d8e5de;">
                Ссылка на ваш проект (Scratch или MakeCode):
              </label>
              <input type="url" id="project-link-input" class="task-answer" placeholder="https://..." style="font-size:14px; padding:10px 14px; background:#1a231e; color:#fff;" />
            </div>
            <div class="field" style="margin-bottom:12px;">
              <label for="project-media-input" style="font-size:13px; font-weight:700; display:block; margin-bottom:6px; color:#d8e5de;">
                Ссылка на скриншот / видео демонстрацию:
              </label>
              <input type="text" id="project-media-input" class="task-answer" placeholder="https://..." style="font-size:14px; padding:10px 14px; background:#1a231e; color:#fff;" />
            </div>
            <div class="field" style="margin-bottom:16px;">
              <label for="project-notes-input" style="font-size:13px; font-weight:700; display:block; margin-bottom:6px; color:#d8e5de;">
                Пояснения к решению (какие алгоритмические конструкции применены):
              </label>
              <textarea id="project-notes-input" class="task-answer" placeholder="2-3 предложения о логике программы, циклах и переменных..." style="height:70px; background:#1a231e; color:#fff;"></textarea>
            </div>
            <div style="display:flex; justify-content:flex-end;">
              <button class="button button-lime" id="btn-submit-project" type="button" style="padding:12px 26px; font-weight:700;">
                Сдать проект куратору
              </button>
            </div>
          </div>
        `;

        workbenchMount.querySelector('#btn-submit-project').onclick = async () => {
          const pLink = (workbenchMount.querySelector('#project-link-input')?.value || '').trim();
          const pMedia = (workbenchMount.querySelector('#project-media-input')?.value || '').trim();
          const pNotes = (workbenchMount.querySelector('#project-notes-input')?.value || '').trim();

          if (!pLink && !pMedia && !pNotes) {
            showMessage('Пожалуйста, введите ссылку на проект или описание.', true);

            return;
          }

          const combined = `Проект: ${pLink}\nМедиа: ${pMedia}\nПояснение: ${pNotes}`;

          try {
            await submitAnswer(task, combined, { workbench: false });
            playChime(true);
            showMessage('Проект сдан и отправлен в очередь проверки куратора.');
          } catch (e) {
            showMessage('Ошибка: ' + e.message, true);
          }
        };
      }
    };

    const renderTask = async (task, { workbench = true } = {}) => {
      const meta = task.answer_json || {};
      const stepNum = task.step_number || `Шаг ${task.id}`;
      const stepType = task.type || 'theory';
      const checkType = task.check_type || 'Автоматическая';
      const submitType = task.submit_type || '—';

      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('course', courseId);
      currentUrl.searchParams.set('task', task.id);
      window.history.replaceState(null, '', currentUrl.toString());

      const taskIdx = tasks.findIndex(t => t.id === task.id);
      const counterEl = document.querySelector('.task-counter');

      if (counterEl) {
        counterEl.textContent = `${String(taskIdx + 1).padStart(2, '0')} / ${String(tasks.length).padStart(2, '0')}`;
      }

      updateFooterNav();

      const pageHeadEyebrow = document.querySelector('.page-head .eyebrow');

      if (pageHeadEyebrow) pageHeadEyebrow.textContent = `${task.course_title || 'Курс'} · ${task.module_name || 'Модуль'}`;

      const eyebrow = taskPage?.querySelector('.eyebrow');

      if (eyebrow) eyebrow.textContent = `Шаг ${stepNum} · ${stepLabel(stepType)}`;

      const h2 = taskPage?.querySelector('h2');

      if (h2) h2.textContent = task.title || `Шаг ${stepNum}`;

      let passportGrid = taskPage?.querySelector('.step-passport-grid');

      if (!passportGrid && taskPage) {
        passportGrid = document.createElement('div');
        passportGrid.className = 'step-passport-grid';

        if (h2) h2.after(passportGrid);
      }

      if (passportGrid) {
        passportGrid.innerHTML = `
          <div class="passport-card">
            <span class="passport-label">Тип шага</span>
            <span class="passport-val">${escapeHtml(stepLabel(stepType))}</span>
          </div>
          <div class="passport-card">
            <span class="passport-label">Проверка</span>
            <span class="passport-val">${escapeHtml(checkType)}</span>
          </div>
          <div class="passport-card">
            <span class="passport-label">Что сдаёт ученик</span>
            <span class="passport-val">${escapeHtml(submitType)}</span>
          </div>
          ${stepType === 'code_test' && meta.time_limit ? `
          <div class="passport-card">
            <span class="passport-label">Ограничения</span>
            <span class="passport-val">${escapeHtml(meta.time_limit)}, ${escapeHtml(meta.memory_limit || '256 МБ')}</span>
          </div>` : ''}
        `;
      }

      const promptDiv = taskPage?.querySelector('.task-prompt');

      if (promptDiv) {
        let descHtml = escapeHtml(task.description || '');
        descHtml = descHtml.replace(/\n([ ]{4,}[^\n]+)/g, '\n<span class="code-line">$1</span>');
        promptDiv.innerHTML = `<div class="step-desc-text" style="font-size:14px; line-height:1.6; color:var(--ink);">${descHtml}</div>`;
      }

      let gradeBadge = document.querySelector('[data-task-grade-status]');

      if (!gradeBadge && promptDiv) {
        gradeBadge = document.createElement('div');
        gradeBadge.setAttribute('data-task-grade-status', 'true');
        gradeBadge.style.margin = '14px 0';
        promptDiv.after(gradeBadge);
      }

      const gradeData = await api.get(`/courses/${courseId}/tasks/${task.id}/grade`).catch(() => null);

      if (gradeBadge) {
        if (gradeData) {
          if (gradeData.status === 'completed') {
            gradeBadge.innerHTML = `<div class="grade-note grade-note--done">
              <strong>Шаг успешно пройден. Оценка: ${gradeData.grade} / 100</strong>
              <p>${escapeHtml(gradeData.feedback_message || 'Отличная работа.')}</p>
            </div>`;
          } else if (gradeData.grade === -1) {
            gradeBadge.innerHTML = `<div class="grade-note grade-note--pending">
              <strong>Решение ожидает проверки куратора</strong>
              <p>Куратор проверит работу и выставит оценку с отзывом.</p>
            </div>`;
          } else {
            gradeBadge.innerHTML = `<div class="grade-note grade-note--failed">
              <strong>Пока не зачтено (${gradeData.grade} / 100)</strong>
              <p>${escapeHtml(gradeData.feedback_message || 'Попробуйте ещё раз.')}</p>
            </div>`;
          }
        } else {
          gradeBadge.innerHTML = '';
        }
      }

      const actionArea = document.querySelector('#step-action-area');

      if (actionArea) {
        if (stepType === 'scratch') {
          const numericAnswer = /число/i.test(submitType);

          actionArea.innerHTML = `
            <div style="margin:16px 0; padding:14px; background:var(--panel); border:1px solid var(--line); border-radius:10px;">
              <p style="font-size:12px; color:var(--muted); margin:0 0 8px;">
                ${numericAnswer ? 'Проверьте ход программы в Scratch справа, затем введите число.' : 'Изучите пример справа, соберите свой проект Scratch и отправьте ссылку куратору.'}
              </p>
              <a class="button button-soft" href="/simulators/scratch-ru/index.html?task=${encodeURIComponent(task.step_number || '')}" target="_blank" rel="noopener" style="margin:0 0 14px;">Открыть Scratch на весь экран</a>
              ${numericAnswer ? `<form id="scratch-number-form" class="scratch-number-form">
                <label for="scratch-number-answer">Ответ числом</label>
                <input id="scratch-number-answer" class="task-answer" inputmode="numeric" autocomplete="off" required placeholder="Введите число">
                <button class="button button-lime" type="submit">Проверить ответ</button>
              </form>` : `<form id="scratch-project-form" class="evidence-form">
                <label for="scratch-project-link">Ссылка на опубликованный проект Scratch</label>
                <input id="scratch-project-link" class="task-answer" type="url" required placeholder="https://scratch.mit.edu/projects/...">
                <button class="button button-lime" type="submit">Отправить куратору</button>
              </form>`}
              ${criteriaBox(meta.criteria)}
            </div>
          `;

          if (numericAnswer) {
            actionArea.querySelector('#scratch-number-form')?.addEventListener('submit', async event => {
              event.preventDefault();

              const answer = actionArea.querySelector('#scratch-number-answer')?.value.trim();

              if (!answer) return;

              try {
                const result = await submitAnswer(task, answer, { workbench: false });

                showMessage(result.feedback_message || 'Ответ сохранён.', result.grade !== 100);
              } catch (error) {
                showMessage(error.message || 'Не удалось проверить ответ.', true);
              }
            });
          } else {
            actionArea.querySelector('#scratch-project-form')?.addEventListener('submit', async event => {
              event.preventDefault();

              const project = actionArea.querySelector('#scratch-project-link')?.value.trim();
              let url;

              try { url = new URL(project); } catch { showMessage('Укажите полную ссылку на проект Scratch.', true); return; }

              if (url.protocol !== 'https:' || url.hostname !== 'scratch.mit.edu' || !url.pathname.startsWith('/projects/')) {
                showMessage('Нужна опубликованная ссылка вида https://scratch.mit.edu/projects/...', true);

                return;
              }

              try {
                await submitAnswer(task, `Проект Scratch: ${url.href}`, { workbench: false });
                showMessage('Ссылка отправлена куратору на проверку.');
              } catch (error) {
                showMessage(error.message || 'Не удалось отправить проект.', true);
              }
            });
          }
        } else if (stepType === 'minecraft_edu') {
          actionArea.innerHTML = `
            <div style="margin:16px 0; padding:14px; background:var(--panel); border:1px solid var(--line); border-radius:10px;">
              <p style="font-size:12px; color:var(--muted); margin:0 0 8px;">
                Справа открыт тренировочный симулятор. Итоговое задание выполняется в Minecraft Education MakeCode.
              </p>
              <form id="minecraft-evidence-form" class="evidence-form">
                <label for="mc-project-link">Ссылка на проект MakeCode</label>
                <input id="mc-project-link" class="task-answer" type="url" required placeholder="https://...">
                <label for="mc-screenshot-link">Ссылка на скриншот из мира</label>
                <input id="mc-screenshot-link" class="task-answer" type="url" required placeholder="https://...">
                <button class="button button-lime" type="submit">Отправить куратору</button>
              </form>
              ${criteriaBox(meta.criteria)}
            </div>
          `;

          actionArea.querySelector('#minecraft-evidence-form')?.addEventListener('submit', async event => {
            event.preventDefault();

            const project = actionArea.querySelector('#mc-project-link')?.value.trim();
            const screenshot = actionArea.querySelector('#mc-screenshot-link')?.value.trim();

            if (!project || !screenshot) return;

            try {
              await submitAnswer(task, `Проект MakeCode: ${project}\nСкриншот: ${screenshot}`, { workbench: false });
              showMessage('Материалы отправлены куратору на проверку.');
            } catch (error) {
              showMessage(error.message || 'Не удалось отправить материалы.', true);
            }
          });
        } else {
          actionArea.innerHTML = '';
        }
      }

      if (workbench) renderWorkbench(task);
    };

    if (!window._studioMessageListenerAttached) {
      window._studioMessageListenerAttached = true;

      window.addEventListener('message', async (event) => {
        if (event.origin !== window.location.origin) return;

        const data = event.data;

        if (!data || typeof data !== 'object') return;
        if (data.type?.startsWith('SCRATCH_') && event.source !== document.getElementById('scratch-workbench-iframe')?.contentWindow) return;

        if (data.type === 'SCRATCH_READY') {
          const iframe = document.getElementById('scratch-workbench-iframe');

          if (iframe && iframe.contentWindow && currentTask) {
            iframe.contentWindow.postMessage({
              type: 'SCRATCH_INIT',
              config: {
                taskTitle: currentTask.title,
                taskText: currentTask.description,
                submitMode: /число/i.test(currentTask.submit_type || '') ? 'number' : 'review',
                criteria: currentTask.answer_json?.criteria
              }
            }, window.location.origin);
          }
        }

        else if (data.type === 'SCRATCH_SUBMISSION') {
          if (/число/i.test(currentTask?.submit_type || '')) return;

          showMessage('Для сдачи опубликуйте проект в Scratch и вставьте ссылку в форму слева.');
          document.getElementById('scratch-project-link')?.focus();
        }

        else if (data.type === 'KUMIR_SUBMISSION') {
          if (event.source !== document.getElementById('kumir-workbench-iframe')?.contentWindow) return;

          showMessage('Тренировка завершена. Для зачёта отправьте проект MakeCode и скриншот слева.');
        }
      });
    }

    renderStepper();
    renderTask(currentTask);

    if (window.matchMedia('(max-width: 620px)').matches) {
      history.scrollRestoration = 'manual';
      requestAnimationFrame(() => window.scrollTo(0, 0));
      setTimeout(() => window.scrollTo(0, 0), 180);
    }
  });
}

document.addEventListener('DOMContentLoaded', initTasksPage);
