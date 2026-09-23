const api = window.pixelApi;
const toast = document.querySelector('.toast');
const showMessage = (message, isError = false) => { if (!toast) return; toast.textContent = message; toast.classList.toggle('error', isError); toast.classList.add('visible'); window.clearTimeout(window.pixelToast); window.pixelToast = setTimeout(() => toast.classList.remove('visible'), 2800); };
const run = async (action, success) => { try { await action(); showMessage(success); } catch (error) { showMessage(error.message, true); } };

document.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => showMessage(button.dataset.toast)));
document.querySelectorAll('.reveal').forEach(item => { if (!('IntersectionObserver' in window)) item.classList.add('visible'); else new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); } }), { threshold: .1 }).observe(item); });

const formJson = form => Object.fromEntries(new FormData(form).entries());
const bind = (selector, callback) => document.querySelector(selector)?.addEventListener('submit', event => { event.preventDefault(); callback(event.currentTarget); });

bind('[data-form="login"]', form => run(async () => { api.auth.save(await api.post('/auth/login', formJson(form))); window.location.href = '../student/index.html'; }, 'Вход выполнен.'));
bind('[data-form="register"]', form => run(async () => { await api.post('/auth/register', formJson(form)); window.location.href = 'login.html'; }, 'Аккаунт создан. Теперь войдите.'));
bind('[data-form="profile"]', form => run(async () => { const user = await api.patch('/users/me', formJson(form)); localStorage.setItem('pixelstart_user', JSON.stringify(user)); }, 'Профиль сохранён.'));
bind('[data-form="course-create"]', form => run(async () => { const course = await api.post('/panel/courses', formJson(form)); form.reset(); document.querySelector('[data-result]').textContent = `Курс #${course.id} создан.`; }, 'Курс создан.'));
bind('[data-form="lesson-create"]', form => run(async () => { const lesson = await api.post('/panel/lessons', { module_id: Number(form.module_id.value), type: form.type.value, duration: Number(form.duration.value || 0) }); form.reset(); document.querySelector('[data-result]')?.replaceChildren(document.createTextNode(`Урок #${lesson.id} создан.`)); }, 'Урок создан.'));
bind('[data-form="task-create"]', form => run(async () => { const task = await api.post(`/panel/lessons/${form.lesson_id.value}/tasks`, { type: form.type.value, description: form.description.value, answer_json: null }); form.reset(); document.querySelector('[data-result]')?.replaceChildren(document.createTextNode(`Задание #${task.id} создано.`)); }, 'Задание создано.'));
bind('[data-form="stream-create"]', form => run(async () => { await api.post('/panel/streams', { ...formJson(form), course_id: Number(form.course_id.value), curator_id: Number(form.curator_id.value), start_date: new Date(form.start_date.value).toISOString(), end_date: new Date(form.end_date.value).toISOString() }); form.reset(); }, 'Поток создан.'));
bind('[data-form="broadcast"]', form => run(async () => { await api.post(`/streams/${form.stream_id.value}/broadcasts`, { text: form.text.value }); form.reset(); }, 'Объявление опубликовано.'));
bind('[data-form="submit-task"]', form => run(async () => { let fileId = null; const file = form.file?.files?.[0]; if (file) { const upload = new FormData(); upload.append('file', file); fileId = (await api.upload('/files', upload)).file_id; } await api.post(`/courses/${form.course_id.value}/tasks/${form.task_id.value}/submissions`, { input: form.input.value, file_id: fileId }); }, 'Ответ отправлен на проверку.'));
bind('[data-form="grade"]', form => run(async () => { await api.patch(`/streams/${form.stream_id.value}/tasks/${form.task_id.value}/submissions/${form.submission_id.value}`, { grade: Number(form.grade.value), feedback_message: form.feedback_message.value }); }, 'Оценка сохранена.'));
bind('[data-form="participant-decision"]', form => run(async () => { await api.post(`/streams/${form.stream_id.value}/participants/${form.user_id.value}/${form.decision.value}`, {}); }, 'Решение по заявке применено.'));
bind('[data-form="reject-file"]', form => run(async () => { await api.delete(`/streams/${form.stream_id.value}/tasks/${form.task_id.value}/submissions/${form.submission_id.value}/file?reason=${encodeURIComponent(form.reason.value)}`); }, 'Файл удалён, причина сохранена.'));
bind('[data-form="user-patch"]', form => run(async () => { await api.patch(`/panel/users/${form.user_id.value}`, { role: form.role.value, payment: form.payment.value === 'true' }); }, 'Пользователь обновлён.'));

document.querySelectorAll('[data-load]').forEach(element => { run(async () => { const data = await api.get(element.dataset.load); element.textContent = JSON.stringify(data, null, 2); }, 'Данные обновлены.'); });
document.querySelectorAll('button[data-load]').forEach(button => button.addEventListener('click', () => run(async () => {
  const output = button.closest('.top-actions')?.parentElement?.parentElement?.querySelector('.data-output');
  if (output) output.textContent = JSON.stringify(await api.get(button.dataset.load), null, 2);
}, 'Данные обновлены.')));
document.querySelectorAll('[data-logout]').forEach(button => button.addEventListener('click', () => { api.auth.clear(); window.location.href = '../index.html'; }));

const loadCourses = document.querySelector('[data-courses]');
if (loadCourses) {
  run(async () => {
    const courses = await api.get('/courses');
    loadCourses.innerHTML = courses.map(course => `<article class="card course-card" data-course-type="${course.type}"><div class="course-art ${course.type === 'scratch' ? 'green' : course.type === 'minecraft_edu' ? 'blue' : 'coral'}"><span class="art-label">${course.type.toUpperCase()}</span><div class="art-code">API COURSE #${course.id}</div></div><div class="course-body"><div class="course-meta"><span>${course.type}</span><span>Курс #${course.id}</span></div><h3>${course.title}</h3><p>${course.description || 'Описание курса появится после публикации администратором.'}</p><a class="button button-dark" href="course/index.html?course=${course.id}">Открыть курс <span>↗</span></a></div></article>`).join('');
  }, 'Каталог обновлён.');
}

document.querySelectorAll('[data-course-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-course-filter]').forEach(item => item.classList.toggle('active', item === button));
  document.querySelectorAll('[data-course-type]').forEach(card => card.hidden = button.dataset.courseFilter !== 'all' && card.dataset.courseType !== button.dataset.courseFilter);
}));

document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => {
  document.documentElement.dataset.theme = button.dataset.theme;
  localStorage.setItem('pixelstart_theme', button.dataset.theme);
  showMessage(`Тема «${button.dataset.theme === 'dark' ? 'тёмная' : 'светлая'}» применена.`);
}));
if (localStorage.getItem('pixelstart_theme') === 'dark') document.documentElement.dataset.theme = 'dark';

document.querySelectorAll('[data-load-target]').forEach(button => button.addEventListener('click', () => run(async () => {
  const section = button.closest('section');
  const id = section.querySelector('[name="stream_id"]')?.value || '1';
  const path = button.dataset.loadTarget === 'participants' ? `/streams/${id}/participants` : button.dataset.loadTarget === 'broadcasts' ? `/streams/${id}/broadcasts` : button.dataset.loadTarget === 'schedule' ? '/users/me/schedule' : `/panel/users${section.querySelector('#role')?.value ? `?role=${section.querySelector('#role').value}` : ''}`;
  const output = document.querySelector(`[data-result="${button.dataset.loadTarget}"]`);
  output.textContent = JSON.stringify(await api.get(path), null, 2);
}, 'Данные потока обновлены.')));
