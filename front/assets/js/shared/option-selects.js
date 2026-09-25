const optionSources = {
  courses: async () => (await api.get('/courses?limit=100')).map(course => [course.id, `${course.title} (#${course.id})`]),
  curators: async () => (await api.get('/panel/users?role=curator&limit=100')).map(user => [user.id, `${user.first_name} ${user.last_name} (@${user.username})`]),
  users: async () => (await api.get('/panel/users?limit=100')).map(user => [user.id, `${user.first_name} ${user.last_name} (@${user.username})`]),
  modules: async () => (await api.get('/panel/modules')).map(mod => [mod.id, `${mod.course_title} · ${mod.name}`]),
  lessons: async () => (await api.get('/panel/lessons')).map(lesson => [
    lesson.id,
    `${lesson.course_title} · ${lesson.module_name} · ${lesson.first_task_title || `Урок #${lesson.id}`} (${lesson.tasks} ${plural(lesson.tasks, 'шаг', 'шага', 'шагов')})`
  ])
};

document.querySelectorAll('select[data-options]').forEach(select => {
  const source = optionSources[select.dataset.options];

  if (!source) return;

  registerLoader(async () => {
    const previous = select.value;
    const options = await source();

    select.replaceChildren(...options.map(([value, label]) => new Option(label, value)));

    if (!options.length) select.append(new Option('Нет вариантов', ''));
    if (options.some(([value]) => String(value) === previous)) select.value = previous;
  });
});
