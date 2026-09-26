const showResult = text => document.querySelector('[data-result]')?.replaceChildren(document.createTextNode(text));

bind('[data-form="course-create"]', form => run(async () => {
  const course = await api.post('/panel/courses', formJson(form));

  form.reset();
  showResult(`Курс #${course.id} создан.`);
  coursesRequest = null;
  await refreshPageData();
}, 'Курс успешно создан.'));

bind('[data-form="lesson-create"]', form => run(async () => {
  const lesson = await api.post('/panel/lessons', {
    module_id: Number(form.module_id.value),
    type: form.type.value,
    duration: Number(form.duration.value || 0)
  });

  form.reset();
  showResult(`Урок #${lesson.id} создан. Добавьте в него задание в форме ниже.`);
  await refreshPageData();

  const lessonPicker = document.querySelector('[data-form="task-create"] [name="lesson_id"]');

  if (lessonPicker) lessonPicker.value = String(lesson.id);
}, 'Урок создан.'));

bind('[data-form="task-create"]', form => run(async () => {
  const task = await api.post(`/panel/lessons/${form.lesson_id.value}/tasks`, {
    type: form.type.value,
    description: form.description.value,
    answer_json: null
  });

  // Keep the lesson selected: admins usually add several steps to one lesson in a row.
  const lessonId = form.lesson_id.value;

  form.reset();
  showResult(`Задание #${task.id} создано.`);
  await refreshPageData();
  form.lesson_id.value = lessonId;
}, 'Задание создано.'));

bind('[data-form="stream-create"]', form => run(async () => {
  const stream = await api.post('/panel/streams', {
    name: form.name.value,
    course_id: Number(form.course_id.value),
    curator_id: Number(form.curator_id.value),
    start_date: new Date(form.start_date.value).toISOString(),
    end_date: new Date(form.end_date.value).toISOString()
  });

  form.reset();
  showResult(`Поток #${stream.id} создан.`);
  await refreshPageData();
}, 'Поток создан.'));

bind('[data-form="user-patch"]', form => run(async () => {
  await api.patch(`/panel/users/${form.user_id.value}`, {
    role: form.role.value,
    payment: form.payment.value === 'true',
    ...(form.is_verified?.value ? { is_verified: form.is_verified.value === 'true' } : {})
  });

  await refreshPageData();
}, 'Пользователь обновлён.'));
