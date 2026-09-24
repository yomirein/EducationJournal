const api = window.pixelApi;
const toast = document.querySelector('.toast');

// Shows a brief feedback message for API actions.
const showMessage = (message, isError = false) => {
  if (!toast) return;
  
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('visible');
  
  window.clearTimeout(window.pixelToast);
  window.pixelToast = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2800);
};

// Runs an API action and reports success or failure.
const run = async (action, success) => {
  try {
    await action();
    showMessage(success);
  } catch (error) {
    let errorMessage = error.message;
    if (errorMessage === 'Failed to fetch') {
      errorMessage = 'Не удалось связаться с сервером. Проверь подключение и попробуй ещё раз.';
    }
    const result = document.querySelector('[data-result]');
    if (result) {
      result.textContent = errorMessage;
      result.classList.add('error-copy');
      result.setAttribute('role', 'alert');
    }
    showMessage(errorMessage, true);
  }
};

document.querySelectorAll('[data-toast]').forEach(button => {
  button.addEventListener('click', () => {
    showMessage(button.dataset.toast);
  });
});

document.querySelectorAll('.reveal').forEach(item => {
  if (!('IntersectionObserver' in window)) {
    item.classList.add('visible');
  } else {
    new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 }).observe(item);
  }
});

// Converts form controls into a plain request payload.
const formJson = form => Object.fromEntries(new FormData(form).entries());

// Shows only courses matching the selected API-provided type.
function toggleCourseFilters(filter) {
  document.querySelectorAll('[data-course-type]').forEach(card => {
    card.hidden = filter !== 'all' && card.dataset.courseType !== filter;
  });
}

// Connects a form to its asynchronous submit handler.
const bind = (selector, callback) => {
  document.querySelector(selector)?.addEventListener('submit', event => {
    event.preventDefault();
    callback(event.currentTarget);
  });
};

bind('[data-form="login"]', form => run(async () => {
  api.auth.save(await api.post('/auth/login', formJson(form)));
  window.location.href = '../student/index.html';
}, 'Вход выполнен.'));

bind('[data-form="register"]', form => run(async () => {
  await api.post('/auth/register', formJson(form));
  window.location.href = 'login.html';
}, 'Аккаунт создан. Теперь войдите.'));

bind('[data-form="profile"]', form => run(async () => {
  const user = await api.patch('/users/me', formJson(form));
  localStorage.setItem('pixelstart_user', JSON.stringify(user));
}, 'Профиль сохранён.'));

bind('[data-form="course-create"]', form => run(async () => {
  const course = await api.post('/panel/courses', formJson(form));
  form.reset();
  document.querySelector('[data-result]').textContent = `Курс #${course.id} создан.`;
}, 'Курс создан.'));

bind('[data-form="lesson-create"]', form => run(async () => {
  const lesson = await api.post('/panel/lessons', {
    module_id: Number(form.module_id.value),
    type: form.type.value,
    duration: Number(form.duration.value || 0)
  });
  form.reset();
  document.querySelector('[data-result]')?.replaceChildren(
    document.createTextNode(`Урок #${lesson.id} создан.`)
  );
}, 'Урок создан.'));

bind('[data-form="task-create"]', form => run(async () => {
  const task = await api.post(`/panel/lessons/${form.lesson_id.value}/tasks`, {
    type: form.type.value,
    description: form.description.value,
    answer_json: null
  });
  form.reset();
  document.querySelector('[data-result]')?.replaceChildren(
    document.createTextNode(`Задание #${task.id} создано.`)
  );
}, 'Задание создано.'));

bind('[data-form="stream-create"]', form => run(async () => {
  await api.post('/panel/streams', {
    ...formJson(form),
    course_id: Number(form.course_id.value),
    curator_id: Number(form.curator_id.value),
    start_date: new Date(form.start_date.value).toISOString(),
    end_date: new Date(form.end_date.value).toISOString()
  });
  form.reset();
}, 'Поток создан.'));

bind('[data-form="broadcast"]', form => run(async () => {
  await api.post(`/streams/${form.stream_id.value}/broadcasts`, {
    text: form.text.value
  });
  form.reset();
}, 'Объявление опубликовано.'));

bind('[data-form="submit-task"]', form => run(async () => {
  let fileId = null;
  const file = form.file?.files?.[0];
  
  if (file) {
    const upload = new FormData();
    upload.append('file', file);
    fileId = (await api.upload('/files', upload)).file_id;
  }
  
  await api.post(`/courses/${form.course_id.value}/tasks/${form.task_id.value}/submissions`, {
    input: form.input.value,
    file_id: fileId
  });
  form.reset();
}, 'Ответ отправлен на проверку.'));

bind('[data-form="grade"]', form => run(async () => {
  await api.patch(
    `/streams/${form.stream_id.value}/tasks/${form.task_id.value}/submissions/${form.submission_id.value}`,
    {
      grade: Number(form.grade.value),
      feedback_message: form.feedback_message.value
    }
  );
}, 'Оценка сохранена.'));

bind('[data-form="participant-decision"]', form => run(async () => {
  await api.post(
    `/streams/${form.stream_id.value}/participants/${form.user_id.value}/${form.decision.value}`,
    {}
  );
}, 'Решение по заявке применено.'));

bind('[data-form="reject-file"]', form => run(async () => {
  await api.delete(
    `/streams/${form.stream_id.value}/tasks/${form.task_id.value}/submissions/${form.submission_id.value}/file?reason=${encodeURIComponent(form.reason.value)}`
  );
}, 'Файл удалён, причина сохранена.'));

bind('[data-form="user-patch"]', form => run(async () => {
  await api.patch(`/panel/users/${form.user_id.value}`, {
    role: form.role.value,
    payment: form.payment.value === 'true'
  });
}, 'Пользователь обновлён.'));

document.querySelectorAll('[data-load]').forEach(element => {
  const output = element.matches('button') && element.dataset.output
    ? document.querySelector(element.dataset.output)
    : element;

  const load = () => run(async () => {
    const data = await api.get(element.dataset.load);
    if (output) {
      output.textContent = JSON.stringify(data, null, 2);
      output.setAttribute('aria-busy', 'false');
    }
  }, 'Данные обновлены.');

  if (element.matches('button')) {
    element.addEventListener('click', load);
  } else {
    load();
  }
});

document.querySelectorAll('[data-logout]').forEach(button => {
  button.addEventListener('click', () => {
    api.auth.clear();
    window.location.href = '../index.html';
  });
});

const pageAccess = {
  student: ['student/index.html', 'student/courses.html', 'student/catalog.html', 'student/profile.html', 'student/settings.html', 'student/course/index.html', 'student/course/lessons.html', 'student/course/tasks.html'],
  curator: ['curator/index.html', 'curator/broadcast.html', 'curator/participants.html', 'curator/review.html'],
  admin: ['admin/index.html', 'admin/course.html', 'admin/lessons.html', 'admin/streams.html', 'admin/users.html']
};

// Checks a protected page against the current backend user role.
async function verifyPageAccess() {
  const pathname = decodeURIComponent(window.location.pathname).replace(/\\/g, '/');
  const requiredRole = Object.entries(pageAccess).find(([, pages]) => pages.some(page => pathname.endsWith(`/${page}`)))?.[0];

  if (!requiredRole) return;

  try {
    if (!api.auth.access) throw new Error('Войдите в аккаунт, чтобы открыть эту страницу.');
    const user = await api.get('/users/me');
    if (user.role !== requiredRole && user.role !== 'admin') {
      throw new Error('У вашей учётной записи нет доступа к этому разделу.');
    }
  } catch (error) {
    api.auth.clear();
    document.body.replaceChildren();
    const main = document.createElement('main');
    main.className = 'fallback-error';
    const heading = document.createElement('h1');
    heading.textContent = 'Раздел недоступен';
    const message = document.createElement('p');
    message.textContent = error.message;
    const login = document.createElement('a');
    login.className = 'button button-dark';
    const relativeRoot = requiredRole === 'student' && pathname.includes('/student/course/') ? '../../' : '../';
    login.href = `${relativeRoot}auth/login.html`;
    login.textContent = 'Перейти ко входу';
    main.append(heading, message, login);
    document.body.append(main);
  }
}

verifyPageAccess();

const loadCourses = document.querySelector('[data-courses]');

if (loadCourses) {
  run(async () => {
    const courses = await api.get('/courses');
    const entries = Array.isArray(courses) ? courses : [];
    window.pixelCourses = entries;
    loadCourses.setAttribute('aria-busy', 'false');
    loadCourses.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'loading';
      empty.textContent = 'В каталоге пока нет доступных курсов.';
      loadCourses.append(empty);
      return;
    }

    entries.forEach(course => {
      const article = document.createElement('article');
      article.className = 'card course-card';
      const art = document.createElement('div');
      art.className = 'course-art';
      const body = document.createElement('div');
      body.className = 'course-body';
      const meta = document.createElement('div');
      meta.className = 'course-meta';
      const type = document.createElement('span');
      type.textContent = course.type || 'Курс';
      const id = document.createElement('span');
      id.textContent = `Курс #${course.id}`;
      const title = document.createElement('h3');
      title.textContent = course.title;
      const description = document.createElement('p');
      description.textContent = course.description || 'Описание курса пока не добавлено.';
      const link = document.createElement('a');
      link.className = 'button button-dark';
      link.href = `course/index.html?course=${encodeURIComponent(course.id)}`;
      link.textContent = 'Открыть курс';
      meta.append(type, id);
      body.append(meta, title, description, link);
      article.append(art, body);
      article.dataset.courseType = course.type || '';
      loadCourses.append(article);
    });
    toggleCourseFilters(document.querySelector('[data-course-filter].active')?.dataset.courseFilter || 'all');
  }, 'Каталог обновлён.');
}

document.querySelectorAll('[data-course-filter]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-course-filter]').forEach(item => {
      item.classList.toggle('active', item === button);
    });
    
    toggleCourseFilters(button.dataset.courseFilter);
  });
});

document.querySelectorAll('[data-theme]').forEach(button => {
  button.addEventListener('click', () => {
    document.documentElement.dataset.theme = button.dataset.theme;
    localStorage.setItem('pixelstart_theme', button.dataset.theme);
    showMessage(`Тема «${button.dataset.theme === 'dark' ? 'тёмная' : 'светлая'}» применена.`);
  });
});

if (localStorage.getItem('pixelstart_theme') === 'dark') {
  document.documentElement.dataset.theme = 'dark';
}

document.querySelectorAll('[data-load-target]').forEach(button => {
  button.addEventListener('click', () => run(async () => {
    const section = button.closest('section');
    const id = section.querySelector('[name="stream_id"]')?.value;

    if (button.dataset.loadTarget !== 'schedule' && !id) {
      throw new Error('Сначала укажи ID своего потока.');
    }
    
    let path;
    if (button.dataset.loadTarget === 'participants') {
      path = `/streams/${id}/participants`;
    } else if (button.dataset.loadTarget === 'broadcasts') {
      path = `/streams/${id}/broadcasts`;
    } else if (button.dataset.loadTarget === 'schedule') {
      path = '/users/me/schedule';
    } else {
      const roleParam = section.querySelector('#role')?.value;
      path = roleParam ? `/panel/users?role=${roleParam}` : '/panel/users';
    }
    
    const output = document.querySelector(`[data-result="${button.dataset.loadTarget}"]`);
    output.textContent = JSON.stringify(await api.get(path), null, 2);
    output.setAttribute('aria-busy', 'false');
  }, 'Данные потока обновлены.'));
});

document.querySelectorAll('[data-result]').forEach(result => {
  result.setAttribute('aria-live', 'polite');
});

document.querySelectorAll('form').forEach(form => {
  form.addEventListener('submit', () => {
    form.querySelectorAll('[type="submit"]').forEach(button => {
      button.disabled = true;
      button.dataset.originalText = button.textContent.trim();
      button.textContent = 'Отправляем...';
    });
    window.setTimeout(() => {
      form.querySelectorAll('[type="submit"]').forEach(button => {
        button.disabled = false;
        if (button.dataset.originalText) button.textContent = button.dataset.originalText;
      });
    }, 8000);
  });
});

document.querySelectorAll('[data-load-target]').forEach(button => {
  button.addEventListener('click', () => {
    const output = document.querySelector(`[data-result="${button.dataset.loadTarget}"]`);
    if (!output) return;
    output.setAttribute('aria-busy', 'true');
    output.textContent = 'Загрузка данных...';
  });
});
