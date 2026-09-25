(function() {
  const t = localStorage.getItem('pixelstart_theme') === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  if (t === 'dark') {
    document.documentElement.classList.add('dark');
  }
})();

const api = window.pixelApi;
const toast = document.querySelector('.toast');
const isPassedSubmission = item => item.grade >= 50 && (item.task_type !== 'code_test' || item.grade === 100);

/* --- Public landing page --- */
function initLandingPage() {
  const landing = document.querySelector('.landing-page');
  if (!landing) return;

  const authModal = landing.querySelector('[data-auth-modal]');
  const creatorsModal = landing.querySelector('[data-creators-modal]');
  const openModal = modal => {
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  };
  const closeModal = modal => {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  };
  const isAuthenticated = () => Boolean(api?.auth?.access);

  landing.querySelector('.landing-menu-toggle')?.addEventListener('click', event => {
    const menu = landing.querySelector('.landing-menu');
    const isOpen = menu?.classList.toggle('is-mobile-open');
    event.currentTarget.setAttribute('aria-expanded', String(Boolean(isOpen)));
  });

  landing.querySelectorAll('[data-modal-close]').forEach(button => {
    button.addEventListener('click', () => {
      closeModal(button.closest('.landing-modal'));
    });
  });

  landing.querySelectorAll('[data-auth-link="true"]').forEach(link => {
    link.addEventListener('click', event => {
      if (!isAuthenticated()) {
        event.preventDefault();
        openModal(authModal);
      }
    });
  });

  landing.querySelector('[data-creators-open]')?.addEventListener('click', () => openModal(creatorsModal));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeModal(authModal);
      closeModal(creatorsModal);
    }
  });

  // Only one dropdown is open at a time.
  const closeDropdowns = except => {
    landing.querySelectorAll('.landing-dropdown-menu.is-open').forEach(menu => {
      if (menu !== except) menu.classList.remove('is-open');
    });
    landing.querySelectorAll('[data-dropdown-toggle]').forEach(toggle => {
      const isOpen = document.getElementById(toggle.dataset.dropdownToggle) === except;
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  };
  landing.querySelectorAll('[data-dropdown-toggle]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const menu = document.getElementById(toggle.dataset.dropdownToggle);
      closeDropdowns(menu?.classList.contains('is-open') ? null : menu);
      menu?.classList.toggle('is-open', toggle.getAttribute('aria-expanded') === 'true');
    });
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.landing-dropdown')) closeDropdowns(null);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDropdowns(null);
  });

  const profileLink = landing.querySelector('[data-profile-link]');
  if (isAuthenticated()) {
    api.get('/users/me').then(user => {
      profileLink.textContent = 'Профиль';
      profileLink.href = ({ curator: 'curator/index.html', admin: 'admin/index.html' }[user.role] || 'student/index.html');
    }).catch(() => api.auth.clear());
  }

  const courseMount = landing.querySelector('[data-landing-courses]');
  if (courseMount) {
    api.get('/courses').then(courses => {
      if (!courses.length) {
        courseMount.innerHTML = '<p class="landing-course-empty">Скоро здесь появятся новые направления.</p>';
        return;
      }
      courseMount.innerHTML = courses.slice(0, 3).map((course, index) => {
        const kind = courseType(course.type);
        return `<article class="landing-course landing-course-${index + 1}"><span class="landing-course-number">0${index + 1}</span><span class="landing-course-type">${escapeHtml(kind.label)}</span><h3>${escapeHtml(course.title)}</h3><p>${escapeHtml(course.goal || course.description || 'Практический курс с проектами и заданиями.')}</p><a href="student/catalog.html" data-auth-link="true">Открыть курс <span>↗</span></a></article>`;
      }).join('');
      courseMount.querySelectorAll('[data-auth-link="true"]').forEach(link => link.addEventListener('click', event => {
        if (!isAuthenticated()) {
          event.preventDefault();
          openModal(authModal);
        }
      }));
    }).catch(() => {
      courseMount.innerHTML = '<p class="landing-course-empty">Курсы появятся после подключения сервера.</p>';
    });
  }
}

initLandingPage();

const showMessage = (message, isError = false) => {
  if (!toast) return;
  
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('visible');
  
  window.clearTimeout(window.pixelToast);
  window.pixelToast = setTimeout(() => {
    toast.classList.remove('visible');
  }, 3200);
};

const errorText = error => (error?.message === 'Failed to fetch'
  ? 'Не удалось связаться с сервером. Проверь подключение и попробуй ещё раз.'
  : error?.message || 'Неизвестная ошибка.');

const run = async (action, success) => {
  try {
    await action();
    if (success) showMessage(success);
  } catch (error) {
    showMessage(errorText(error), true);
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

const formJson = form => Object.fromEntries(new FormData(form).entries());

const bind = (selector, callback) => {
  document.querySelector(selector)?.addEventListener('submit', event => {
    event.preventDefault();
    callback(event.currentTarget);
  });
};

/* --- Shared requests (one call per page load) --- */
let currentUserRequest = null;

// Returns the signed-in user; pass fresh=true after the profile changes.
const getCurrentUser = (fresh = false) => {
  if (!api.auth.access) return Promise.reject(new Error('Войдите в аккаунт, чтобы открыть эту страницу.'));
  if (fresh || !currentUserRequest) {
    currentUserRequest = api.get('/users/me');
    currentUserRequest.catch(() => { currentUserRequest = null; });
  }
  return currentUserRequest;
};

let coursesRequest = null;

const getCourses = () => {
  if (!coursesRequest) {
    coursesRequest = api.get('/courses');
    coursesRequest.catch(() => { coursesRequest = null; });
  }
  return coursesRequest;
};

const homeForRole = role => ({ curator: '/curator/index.html', admin: '/admin/index.html' }[role] || '/student/index.html');

/* --- Shared course helpers --- */
// Russian plural form: plural(3, 'шаг', 'шага', 'шагов') -> 'шага'.
const plural = (count, one, few, many) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

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

/* --- Live page data ---
   Every block that shows API data registers its loader here. After a successful
   change the page calls refreshPageData(), so lists never show stale data. */
const pageLoaders = new Set();

const registerLoader = loader => {
  pageLoaders.add(loader);
  return run(loader);
};

const refreshPageData = () => Promise.all([...pageLoaders].map(loader => run(loader)));

/* --- Auth forms --- */
bind('[data-form="login"]', form => run(async () => {
  const hint = document.querySelector('[data-login-hint]');
  if (hint) hint.hidden = true;
  try {
    api.auth.save(await api.post('/auth/login', formJson(form)));
  } catch (error) {
    // 403 = the email is not confirmed yet: show how to get a new confirmation letter.
    if (error.status === 403 && hint) hint.hidden = false;
    throw error;
  }
  const me = await getCurrentUser(true);
  window.location.href = homeForRole(me.role);
}, 'Вход выполнен.'));

const resetStatus = document.querySelector('[data-reset-status]');
const resetToken = new URLSearchParams(window.location.search).get('token');
if (resetStatus && resetToken) {
  // Opened from the email: ask for the new password instead of the login.
  document.querySelector('[data-form="forgot-password"]').hidden = true;
  document.querySelector('[data-form="reset-password"]').hidden = false;
  resetStatus.textContent = 'Придумайте новый пароль — не короче 8 символов.';
}

bind('[data-form="forgot-password"]', form => run(async () => {
  await api.post('/auth/forgot-password', { login: form.login.value.trim() });
  resetStatus.textContent = 'Если такой аккаунт есть, мы отправили на его почту ссылку для смены пароля. Проверьте и папку «Спам».';
  form.hidden = true;
}));

bind('[data-form="reset-password"]', form => run(async () => {
  if (form.password.value !== form.password_repeat.value) throw new Error('Пароли не совпадают.');
  await api.post('/auth/reset-password', { token: resetToken, password: form.password.value });
  form.hidden = true;
  resetStatus.innerHTML = 'Пароль изменён. <a href="login.html">Войти с новым паролем</a>.';
}, 'Пароль изменён.'));

// Demo accounts are created by backend/scripts/seed.py; quick login works on localhost only.
const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const demoPasswords = { student: 'student12345', curator: 'curator12345', admin: 'admin12345' };

async function quickLogin(role) {
  if (!isLocalHost || !demoPasswords[role]) return;
  api.auth.save(await api.post('/auth/login', { login: role, password: demoPasswords[role] }));
  const me = await getCurrentUser(true);
  window.location.href = homeForRole(me.role);
}

document.querySelectorAll('[data-demo-only]').forEach(element => {
  element.hidden = !isLocalHost;
});

document.querySelectorAll('[data-quick-login]').forEach(button => {
  button.addEventListener('click', () => run(() => quickLogin(button.dataset.quickLogin)));
});

bind('[data-form="register"]', form => run(async () => {
  await api.post('/auth/register', formJson(form));
  showMessage('Аккаунт создан. Мы отправили письмо для подтверждения почты.');
  window.setTimeout(() => { window.location.href = 'login.html'; }, 1600);
}));

bind('[data-form="resend-verification"]', form => run(async () => {
  await api.post(`/auth/resend-verification?email=${encodeURIComponent(form.email.value.trim())}`);
}, 'Письмо отправлено повторно.'));

const verifyStatus = document.querySelector('[data-verify-status]');
const verifyParams = new URLSearchParams(window.location.search);
// The resend form is only useful when the link did not work.
const showResendForm = () => document.querySelector('[data-form="resend-verification"]')?.removeAttribute('hidden');
if (verifyStatus && verifyParams.get('change')) {
  // Link from the "confirm your new email" letter.
  api.post(`/auth/confirm-email-change?token=${encodeURIComponent(verifyParams.get('token') || '')}`)
    .then(user => {
      verifyStatus.textContent = `Готово: почта аккаунта изменена на ${user.email}.`;
    })
    .catch(error => {
      verifyStatus.textContent = `Не удалось сменить почту: ${errorText(error)}`;
      verifyStatus.classList.add('error-copy');
    });
} else if (verifyStatus) {
  const token = verifyParams.get('token');
  if (!token) {
    verifyStatus.textContent = 'В ссылке нет токена. Запросите письмо ещё раз.';
    showResendForm();
  } else {
    api.post(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(user => {
        verifyStatus.textContent = `Почта ${user.email} подтверждена. Теперь можно войти.`;
      })
      .catch(error => {
        verifyStatus.textContent = `Не удалось подтвердить почту: ${errorText(error)}`;
        verifyStatus.classList.add('error-copy');
        showResendForm();
      });
  }
}

/* --- Forms that change data; each one refreshes the page data afterwards --- */
bind('[data-form="profile"]', form => run(async () => {
  // Empty fields mean "leave unchanged": an empty email would fail validation.
  const values = Object.fromEntries(Object.entries(formJson(form)).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value));
  await api.patch('/users/me', values);
  await getCurrentUser(true);
  await refreshPageData();
}, 'Профиль сохранён.'));

bind('[data-form="account"]', form => run(async () => {
  const user = await getCurrentUser();
  const email = form.email.value.trim();
  const payload = {
    first_name: form.first_name.value.trim(),
    last_name: form.last_name.value.trim(),
    description: form.description.value.trim(),
    email
  };
  const emailChanges = email.toLowerCase() !== user.email.toLowerCase();
  if (emailChanges) {
    if (!form.current_password.value) throw new Error('Чтобы сменить почту, введите текущий пароль.');
    payload.current_password = form.current_password.value;
  }
  const updated = await api.patch('/users/me', payload);
  form.current_password.value = '';
  await getCurrentUser(true);
  await refreshPageData();
  showMessage(emailChanges && updated.pending_email
    ? `Профиль сохранён. Подтвердите новую почту по ссылке, отправленной на ${updated.pending_email}.`
    : 'Профиль сохранён.');
}));

bind('[data-form="password-change"]', form => run(async () => {
  if (form.password.value !== form.password_repeat.value) throw new Error('Пароли не совпадают.');
  await api.patch('/users/me', { password: form.password.value, current_password: form.current_password.value });
  form.reset();
}, 'Пароль изменён.'));

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

bind('[data-form="broadcast"]', form => run(async () => {
  await api.post(`/streams/${form.stream_id.value}/broadcasts`, { text: form.text.value });
  form.text.value = '';
  // Show the list of the stream the message was just posted to.
  const listPicker = document.querySelector('[data-stream-reload="broadcasts"]');
  if (listPicker) listPicker.value = form.stream_id.value;
  await refreshPageData();
}, 'Объявление опубликовано.'));

bind('[data-form="reject-file"]', form => run(async () => {
  await api.delete(
    `/streams/${form.stream_id.value}/tasks/${form.task_id.value}/submissions/${form.submission_id.value}/file?reason=${encodeURIComponent(form.reason.value)}`
  );
  form.reason.value = '';
  await refreshPageData();
}, 'Файл удалён, причина сохранена.'));

bind('[data-form="user-patch"]', form => run(async () => {
  await api.patch(`/panel/users/${form.user_id.value}`, {
    role: form.role.value,
    payment: form.payment.value === 'true',
    ...(form.is_verified?.value ? { is_verified: form.is_verified.value === 'true' } : {})
  });
  await refreshPageData();
}, 'Пользователь обновлён.'));

/* --- Logout --- */
document.querySelectorAll('[data-logout]').forEach(button => {
  button.addEventListener('click', () => {
    api.auth.clear();
    window.location.href = '/index.html';
  });
});

/* --- Role guard for protected sections --- */
const pageAccess = {
  student: '/student/',
  curator: '/curator/',
  admin: '/admin/'
};

// Checks a protected page against the current backend user role.
async function verifyPageAccess() {
  const pathname = decodeURIComponent(window.location.pathname).replace(/\\/g, '/');
  const requiredRole = Object.entries(pageAccess).find(([, prefix]) => pathname.includes(prefix))?.[0];
  if (!requiredRole) return;

  try {
    const user = await getCurrentUser();
    if (user.role !== requiredRole && user.role !== 'admin') {
      throw new Error('У вашей учётной записи нет доступа к этому разделу.');
    }
  } catch (error) {
    document.body.replaceChildren();
    const main = document.createElement('main');
    main.className = 'fallback-error';
    const heading = document.createElement('h1');
    heading.textContent = 'Раздел недоступен';
    const message = document.createElement('p');
    message.textContent = errorText(error);
    const login = document.createElement('a');
    login.className = 'button button-dark';
    login.href = '/auth/login.html';
    login.textContent = 'Перейти ко входу';
    main.append(heading, message, login);
    document.body.append(main);
  }
}

verifyPageAccess();

/* --- Raw API output blocks (profile, admin and curator tools) --- */
const renderJson = (output, data) => {
  output.textContent = JSON.stringify(data, null, 2);
  output.setAttribute('aria-busy', 'false');
};

document.querySelectorAll('pre.data-output[data-load]').forEach(output => {
  output.setAttribute('aria-busy', 'true');
  registerLoader(async () => renderJson(output, await api.get(output.dataset.load)));
});

// The curator's stream picker on the broadcast page drives the feed below the form.
const selectedStream = () => document.querySelector('select[data-stream-reload="broadcasts"]');

const loadTargets = {
  broadcasts: () => {
    const streamId = Number(selectedStream()?.value);
    if (!streamId) throw new Error('Сначала выберите поток.');
    return `/streams/${streamId}/broadcasts`;
  }
};

const renderBroadcastFeed = (output, items) => {
  output.setAttribute('aria-busy', 'false');
  if (!items.length) {
    output.innerHTML = '<div class="empty-state-box">В этом потоке пока нет объявлений. Напишите первое сообщение выше.</div>';
    return;
  }
  const picker = selectedStream();
  const streamName = picker?.selectedOptions[0]?.textContent || 'Поток';
  output.innerHTML = `<div class="broadcast-feed-list">${items.map(item => `
    <div class="broadcast-feed-card">
      <div class="broadcast-feed-header">
        <span class="broadcast-stream-tag">${escapeHtml(streamName)}</span>
        <span class="broadcast-date-label">${item.timestamp ? new Date(item.timestamp).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
      </div>
      <p class="broadcast-feed-text">${escapeHtml(item.text)}</p>
    </div>`).join('')}</div>`;
};

// Blocks with a dedicated view; everything else is shown as raw JSON.
const loadRenderers = { broadcasts: renderBroadcastFeed };

document.querySelectorAll('[data-load-target]').forEach(button => {
  const pathFor = loadTargets[button.dataset.loadTarget];
  const output = document.querySelector(`[data-result="${button.dataset.loadTarget}"]`);
  if (!pathFor || !output) return;
  // Registered on first use, then re-run by refreshPageData() after changes.
  const render = loadRenderers[button.dataset.loadTarget] || renderJson;
  const loader = async () => {
    const path = pathFor(button.closest('section') || document);
    output.setAttribute('aria-busy', 'true');
    render(output, await api.get(path));
  };
  button.addEventListener('click', () => registerLoader(loader));
});

/* --- Curator stream pickers ---
   Every select[data-stream-select] lists the curator's own streams. A picker with
   data-stream-reload="X" reloads block X (its [data-load-target="X"] button) on change. */
const streamPickers = document.querySelectorAll('select[data-stream-select]');
const streamPickersReady = streamPickers.length
  ? api.get('/users/me/streams').then(streams => {
    streamPickers.forEach(select => {
      select.replaceChildren(...streams.map(stream => new Option(stream.stream_name, stream.stream_id)));
      if (!streams.length) select.append(new Option('У вас пока нет потоков', ''));
    });
  }).catch(error => showMessage(errorText(error), true))
  : Promise.resolve();

document.addEventListener('DOMContentLoaded', () => {
  streamPickersReady.then(() => {
    document.querySelectorAll('select[data-stream-reload]').forEach(select => {
      const reload = () => document.querySelector(`[data-load-target="${select.dataset.streamReload}"]`)?.click();
      select.addEventListener('change', reload);
      reload();
    });
  });
});

/* --- Selects filled from the API (admin forms) --- */
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

/* --- Signed-in user in the sidebar and profile form --- */
const roleLabels = {
  student: 'Ученик',
  curator: 'Куратор',
  admin: 'Администратор'
};

const hydrateUser = async () => {
  const user = await getCurrentUser();
  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
  });
  document.querySelectorAll('[data-user-role]').forEach(el => {
    el.textContent = user.email;
  });
  document.querySelectorAll('[data-user-role-badge], .side-user .role').forEach(el => {
    el.textContent = roleLabels[user.role] || user.role;
  });
  const profileForm = document.querySelector('[data-form="profile"]');
  if (profileForm?.description) profileForm.description.value = user.description || '';
  if (profileForm?.email) profileForm.email.value = user.email || '';
  const accountForm = document.querySelector('[data-form="account"]');
  if (accountForm) {
    accountForm.first_name.value = user.first_name || '';
    accountForm.last_name.value = user.last_name || '';
    accountForm.email.value = user.email || '';
    accountForm.description.value = user.description || '';
    const pending = accountForm.querySelector('[data-pending-email]');
    pending.hidden = !user.pending_email;
    pending.textContent = user.pending_email
      ? `Ждём подтверждения новой почты ${user.pending_email}: откройте ссылку из письма. До этого действует текущая.`
      : '';
  }
};

if (api.auth.access && document.querySelector('[data-user-name], [data-user-role], [data-user-role-badge], [data-form="profile"], [data-form="account"]')) {
  registerLoader(hydrateUser);
}

/* ==========================================================================
   DELUXE FEATURE 1: CONFETTI & CELEBRATION ENGINE (STRICTLY NO STICKERS)
   ========================================================================== */
function playVictoryChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const startTime = ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.08);
      gain.gain.setValueAtTime(0.18, startTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime + idx * 0.08);
      osc.stop(startTime + idx * 0.08 + 0.45);
    });
  } catch (e) {}
}

function triggerCelebration(title = 'Уровень пройден', subtitle = 'Алгоритм успешно выполнен', xp = 100) {
  playVictoryChime();

  let modal = document.querySelector('.celebration-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'celebration-modal';
    modal.innerHTML = `
      <canvas class="celebration-canvas"></canvas>
      <div class="celebration-card">
        <div class="celebration-badge-icon">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#b8f34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 class="celebration-title"></h2>
        <p class="celebration-subtitle"></p>
        <div class="celebration-xp-pill">+<span class="xp-val"></span> XP начислено</div>
        <div>
          <button class="button button-lime close-celebration">Продолжить</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-celebration').addEventListener('click', () => {
      modal.classList.remove('visible');
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('visible');
    });
  }

  modal.querySelector('.celebration-title').textContent = title;
  modal.querySelector('.celebration-subtitle').textContent = subtitle;
  modal.querySelector('.xp-val').textContent = xp;
  modal.classList.add('visible');

  // Confetti particles
  const canvas = modal.querySelector('.celebration-canvas');
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const colors = ['#b8f34a', '#ffdf66', '#9edbf4', '#ff9d82', '#ffffff'];
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.75) * 18,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 12,
        life: 1,
        decay: Math.random() * 0.012 + 0.008
      });
    }

    let animId;
    function renderConfetti() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38;
        p.rotation += p.rSpeed;
        p.life -= p.decay;
        if (p.life > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });
      if (alive) {
        animId = requestAnimationFrame(renderConfetti);
      }
    }
    renderConfetti();
  }
}
window.triggerCelebration = triggerCelebration;

function playChime(success) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {}
}
window.playChime = playChime;

/* ==========================================================================
   DELUXE FEATURE 1.5: CENTRAL THEME SYSTEM (LIGHT / DARK)
   ========================================================================== */
function getActiveTheme() {
  return localStorage.getItem('pixelstart_theme') === 'dark' ? 'dark' : 'light';
}

function updateThemeToggleButtons(isDark) {
  // 1. Topbar theme toggles across the page
  document.querySelectorAll('.topbar-theme-toggle').forEach(btn => {
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;">
        ${isDark 
          ? '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
          : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'
        }
      </svg>
      <span>${isDark ? 'Светлая тема' : 'Тёмная тема'}</span>
    `;
    btn.setAttribute('title', isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему');
  });

  // 2. Demo switcher theme toggle button
  const demoToggle = document.getElementById('global-theme-toggle');
  if (demoToggle) {
    demoToggle.textContent = isDark ? 'Светлая тема' : 'Тёмная тема';
  }

  // 3. Settings page buttons
  document.querySelectorAll('button[data-theme]').forEach(btn => {
    const active = (btn.dataset.theme === 'dark' && isDark) || (btn.dataset.theme === 'light' && !isDark);
    btn.classList.toggle('active-theme', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function applyTheme(themeName, showToast = true) {
  const isDark = themeName === 'dark';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', isDark);
  if (document.body) {
    document.body.classList.toggle('dark-theme', isDark);
  }
  localStorage.setItem('pixelstart_theme', isDark ? 'dark' : 'light');
  updateThemeToggleButtons(isDark);
  if (showToast) {
    showMessage(`Тема переключена: ${isDark ? 'Тёмная' : 'Светлая'}`);
  }
}

function initTopbarThemeToggle() {
  const topbar = document.querySelector('.topbar');
  if (!topbar || topbar.querySelector('.topbar-theme-toggle')) return;

  let actions = topbar.querySelector('.top-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'top-actions';
    topbar.appendChild(actions);
  }

  const isDark = getActiveTheme() === 'dark';
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'topbar-theme-toggle';
  toggleBtn.id = 'topbar-theme-toggle';
  actions.prepend(toggleBtn);

  toggleBtn.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme === 'dark';
    applyTheme(current ? 'light' : 'dark', true);
  });

  updateThemeToggleButtons(isDark);
}

/* ==========================================================================
   DELUXE FEATURE 2: HACKATHON DEMO QUICK-SWITCHER & QUICK-NAV (CLEAN / NO EMOJIS)
   ========================================================================== */
function initDemoSwitcher() {
  if (document.querySelector('.demo-switcher')) return;
  if (!isLocalHost) return;

  const path = window.location.pathname;
  let currentRole = 'student';
  if (path.includes('/curator/')) currentRole = 'curator';
  else if (path.includes('/admin/')) currentRole = 'admin';

  const isDark = getActiveTheme() === 'dark';
  const switcher = document.createElement('aside');
  switcher.className = 'demo-switcher';
  switcher.setAttribute('aria-label', 'Панель быстрого переключения ролей и навигации');
  
  switcher.innerHTML = `
    <div class="demo-tray" id="demo-nav-tray">
      <div class="demo-tray-section">
        <span class="demo-tray-label">Быстрый переход к курсам:</span>
        <div class="demo-tray-grid">
          <a class="demo-tray-link" data-demo-course="scratch" href="/student/courses.html" title="Курс 1: Scratch">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>Scratch 3.0</span>
          </a>
          <a class="demo-tray-link" data-demo-course="minecraft" href="/student/courses.html" title="Курс 2: Minecraft Education">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            <span>Minecraft Education</span>
          </a>
          <a class="demo-tray-link" data-demo-course="python" href="/student/courses.html" title="Курс 3: Python 3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            <span>Python 3 IDE</span>
          </a>
          <a class="demo-tray-link" href="/curator/review.html" title="Панель куратора: проверка решений">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>Очередь куратора</span>
          </a>
          <a class="demo-tray-link" href="/student/catalog.html" title="Каталог курсов">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>Каталог курсов</span>
          </a>
          <a class="demo-tray-link" href="/student/course/lessons.html" title="Уроки курса">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span>Уроки</span>
          </a>
        </div>
      </div>
      <div style="font-size:10px; color:#8da498; text-align:right;">Горячая клавиша: Shift + D</div>
    </div>

    <div style="display:flex; align-items:center; gap:6px;">
      <button class="demo-role-btn" id="demo-tray-toggle" type="button" title="Открыть быстрое меню навигации">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <span class="demo-switcher-label">ДЕМО-РОЛЬ:</span>
      <button class="demo-role-btn ${currentRole === 'student' ? 'active' : ''}" data-role-switch="student" title="Войти как Иван Учеников">Ученик</button>
      <button class="demo-role-btn ${currentRole === 'curator' ? 'active' : ''}" data-role-switch="curator" title="Войти как Анна Кураторова">Куратор</button>
      <button class="demo-role-btn ${currentRole === 'admin' ? 'active' : ''}" data-role-switch="admin" title="Войти как Администратор">Админ</button>
      <button class="demo-role-btn" id="global-theme-toggle" title="Переключить тему">${isDark ? 'Светлая тема' : 'Тёмная тема'}</button>
    </div>
  `;
  if (document.body) {
    document.body.appendChild(switcher);
  }
  getCourses().then(courses => {
    const patterns = { scratch: /scratch/i, minecraft: /minecraft/i, python: /python/i };
    for (const [kind, pattern] of Object.entries(patterns)) {
      const course = courses.find(item => pattern.test(item.title || ''));
      const link = switcher.querySelector(`[data-demo-course="${kind}"]`);
      if (course && link) link.href = `/student/course/tasks.html?course=${course.id}`;
    }
  }).catch(() => {});

  const tray = switcher.querySelector('#demo-nav-tray');
  const trayToggle = switcher.querySelector('#demo-tray-toggle');
  trayToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    tray.classList.toggle('is-open');
  });

  document.addEventListener('click', (e) => {
    if (!switcher.contains(e.target)) {
      tray.classList.remove('is-open');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.shiftKey && (e.key === 'D' || e.key === 'в' || e.key === 'В')) {
      tray.classList.toggle('is-open');
    }
  });

  const themeToggle = switcher.querySelector('#global-theme-toggle');
  themeToggle?.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme, true);
  });

  switcher.querySelectorAll('[data-role-switch]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const label = btn.textContent;
      btn.textContent = '...';
      try {
        await quickLogin(btn.dataset.roleSwitch);
      } catch (error) {
        showMessage(`Ошибка переключения роли: ${errorText(error)}`, true);
        btn.textContent = label;
      }
    });
  });
}

/* ==========================================================================
   DELUXE FEATURE 3: ALL-IN-ONE SPLIT STUDIO WORKBENCH (tasks.html)
   ========================================================================== */
function initTasksPage() {
  const taskPage = document.querySelector('.task-page');
  const studioRoot = document.getElementById('studio-tablet-root');
  if (!taskPage && !studioRoot) return;

  const urlParams = new URLSearchParams(window.location.search);
  let requestedTaskId = urlParams.get('task') ? Number(urlParams.get('task')) : null;

  run(async () => {
    const courseId = await resolveCourseId();

    // Normalize URL
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

    // Build Stepper
    let stepperWrap = document.querySelector('[data-task-stepper-container]') || document.querySelector('[data-task-stepper]');
    if (!stepperWrap) {
      stepperWrap = document.createElement('div');
      stepperWrap.className = 'studio-stepper-wrap';
      stepperWrap.setAttribute('data-task-stepper-container', 'true');
      taskPage?.prepend(stepperWrap);
    }

    // Setup Split-View Studio Toggles
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

    // Workbench Header Elements
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

    // -----------------------------------------------------------
    // RENDER WORKBENCH (RIGHT PANE)
    // -----------------------------------------------------------
    const renderWorkbench = async (task) => {
      if (!workbenchMount) return;
      if (task.type !== 'scratch') restoreScratchView();
      if (scratchExpandBtn) scratchExpandBtn.hidden = task.type !== 'scratch';
      workbenchMount.innerHTML = '';
      const meta = task.answer_json || {};
      const stepType = task.type || 'theory';

      // 1. SCRATCH 3.0 STUDIO
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

      // 2. MINECRAFT EDUCATION (KUMIR-CRAFT 2D VOXEL)
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

      // 3. PYTHON 3 CODE SANDBOX & TEST RUNNER
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

        // Restore saved draft from localStorage
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

      // 4. QUIZ INTERACTIVE CARDS
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

      // 5. THEORY CHECKLIST & CONFIRMATION
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

      // 6. PROJECT SUBMISSION FORM
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

    // -----------------------------------------------------------
    // RENDER TASK INFO (LEFT PANE)
    // -----------------------------------------------------------
    const renderTask = async (task, { workbench = true } = {}) => {
      const meta = task.answer_json || {};
      const stepNum = task.step_number || `Шаг ${task.id}`;
      const stepType = task.type || 'theory';
      const checkType = task.check_type || 'Автоматическая';
      const submitType = task.submit_type || '—';

      // Sync URL & counters
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

      // Build or update Step Passport Grid
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

      // Prompt Div
      const promptDiv = taskPage?.querySelector('.task-prompt');
      if (promptDiv) {
        let descHtml = escapeHtml(task.description || '');
        descHtml = descHtml.replace(/\n([ ]{4,}[^\n]+)/g, '\n<span class="code-line">$1</span>');
        promptDiv.innerHTML = `<div class="step-desc-text" style="font-size:14px; line-height:1.6; color:var(--ink);">${descHtml}</div>`;
      }

      // Grade status badge
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

      // Step Action Area: instructions & secondary fallback
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

    // -----------------------------------------------------------
    // GLOBAL BI-DIRECTIONAL MESSAGE LISTENER
    // -----------------------------------------------------------
    if (!window._studioMessageListenerAttached) {
      window._studioMessageListenerAttached = true;
      window.addEventListener('message', async (event) => {
        if (event.origin !== window.location.origin) return;
        const data = event.data;
        if (!data || typeof data !== 'object') return;
        if (data.type?.startsWith('SCRATCH_') && event.source !== document.getElementById('scratch-workbench-iframe')?.contentWindow) return;

        // 1. Scratch Ready -> Init task config
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

        // 2. Scratch Submission received from iframe
        else if (data.type === 'SCRATCH_SUBMISSION') {
          if (/число/i.test(currentTask?.submit_type || '')) return;
          showMessage('Для сдачи опубликуйте проект в Scratch и вставьте ссылку в форму слева.');
          document.getElementById('scratch-project-link')?.focus();
        }

        // 3. Kumir-Craft / Minecraft Submission received from iframe
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

/* ==========================================================================
   DELUXE FEATURE 4: CURATOR LIVE SUBMISSIONS REVIEW (review.html)
   ========================================================================== */
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

      // Click card to open modal review drawer
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

          // Populate modal details
          reviewModal.querySelector('.modal-sub-details').innerHTML = `
            <strong>Ученик:</strong> ${escapeHtml(sub.student_name)} (${escapeHtml(sub.student_email)})<br>
            <strong>Поток:</strong> ${escapeHtml(sub.stream_name || `Поток #${sub.stream_id}`)}<br>
            <strong>Шаг ${escapeHtml(sub.step_number || sub.task_id)}:</strong> ${escapeHtml(sub.task_title || sub.task_description || 'Задание')} · 
            <span style="text-transform:uppercase; font-size:11px; font-weight:700; color:var(--ink);">${escapeHtml(sub.task_type || '')}</span>
          `;

          // Secret curator box: criteria & reference solution
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

          // Student submitted code/link
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

/* ==========================================================================
   CURATOR EARLY WARNINGS (curator/index.html, participants.html)
   ========================================================================== */
const formatLastActivity = value => value
  ? new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  : 'нет сданных работ';

// One line of a student's progress for curator lists; flags reasons to step in.
function progressLine(row) {
  if (!row) return '';
  const warnings = row.risk_reasons.map(reason => `<span class="status status-failed">${escapeHtml(reason)}</span>`).join(' ');
  return `<div style="font-size:12px; color:var(--muted); margin-top:6px; line-height:1.6;">
    Пройдено ${row.passed} из ${row.total} (${row.percent}%, по графику ${row.expected_percent}%) · ${row.points} баллов · место ${row.rank}
    · последняя работа: ${formatLastActivity(row.last_activity)}
    ${warnings ? `<div style="margin-top:4px; display:flex; gap:6px; flex-wrap:wrap;">${warnings}</div>` : ''}
  </div>`;
}

function initCuratorRiskBoard() {
  const body = document.querySelector('[data-risk-body]');
  if (!body) return;
  registerLoader(async () => {
    const streams = await api.get('/users/me/streams');
    const perStream = await Promise.all(streams.map(async stream => ({
      stream,
      rows: await api.get(`/streams/${stream.stream_id}/progress`)
    })));
    const atRisk = perStream.flatMap(({ stream, rows }) => rows
      .filter(row => row.risk_reasons.length)
      .map(row => ({ ...row, stream_name: stream.stream_name })));
    // A student may study in several streams: count people, not enrolments.
    const students = new Set(perStream.flatMap(item => item.rows.map(row => row.user_id))).size;
    if (!atRisk.length) {
      body.innerHTML = `<p style="color:var(--muted);">Все ${students} ${plural(students, 'ученик идёт', 'ученика идут', 'учеников идут')} по графику и сдают работы. Предупреждение появится, если ученик отстанет от графика потока на 20% или не будет сдавать работы 7 дней.</p>`;
      return;
    }
    body.innerHTML = `
      <p style="color:var(--muted); margin:0 0 12px;">${new Set(atRisk.map(row => row.user_id)).size} из ${students} ${plural(students, 'ученика', 'учеников', 'учеников')} стоит поддержать сейчас, пока они не перестали заходить.</p>
      <div class="participants-grid">${atRisk.map(row => `
        <div class="participant-item">
          <div class="participant-info">
            <div>
              <strong style="font-size:14px; display:block;">${escapeHtml(row.student_name)}</strong>
              <span style="font-size:11px; color:var(--muted);">${escapeHtml(row.stream_name)} · @${escapeHtml(row.username)}</span>
              ${progressLine(row)}
            </div>
          </div>
          <div class="participant-actions">
            <a class="button button-soft" href="broadcast.html">Написать потоку</a>
          </div>
        </div>`).join('')}
      </div>`;
  });
}

/* ==========================================================================
   DELUXE FEATURE 5: CURATOR PARTICIPANTS MANAGEMENT (participants.html)
   ========================================================================== */
function initCuratorParticipants() {
  const pre = document.querySelector('[data-result="participants"]');
  if (!pre || !window.location.pathname.includes('participants.html')) return;

  const card = pre.closest('.card');
  if (!card) return;

  let grid = card.querySelector('[data-participants-grid]');
  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'participants-grid';
    grid.setAttribute('data-participants-grid', 'true');
    pre.after(grid);
    pre.style.display = 'none';
  }

  window.refreshCuratorParticipants = async () => {
    const streamId = card.querySelector('[name="stream_id"]')?.value;
    if (!streamId) {
      grid.innerHTML = '<p style="color:var(--muted); padding:10px 0;">У вас пока нет потоков.</p>';
      return;
    }
    let participants;
    let progress;
    try {
      [participants, progress] = await Promise.all([
        api.get(`/streams/${streamId}/participants`),
        api.get(`/streams/${streamId}/progress`)
      ]);
    } catch (error) {
      grid.innerHTML = `<p class="error-copy" style="padding:10px 0;">${escapeHtml(errorText(error))}</p>`;
      return;
    }

    if (participants.length === 0) {
      grid.innerHTML = '<p style="color:var(--muted); padding:10px 0;">В потоке пока нет заявок.</p>';
      return;
    }

    grid.innerHTML = participants.map(p => {
      const [statusText, statusCss] = {
        accepted: ['Принят', 'status-done'],
        rejected: ['Отклонён', 'status-failed']
      }[p.status] || ['Ожидает решения', 'status-review'];

      return `
        <div class="participant-item">
          <div class="participant-info">
            <div class="avatar-circle">#${Number(p.user_id)}</div>
            <div>
              <strong style="font-size:14px; display:block;">${escapeHtml(`${p.first_name || ''} ${p.last_name || ''}`.trim() || `Ученик #${p.user_id}`)}</strong>
              <span style="font-size:11px; color:var(--muted);">@${escapeHtml(p.username || '')} · ID ${Number(p.user_id)}</span>
              <span class="status ${statusCss}" style="margin-top:4px;">${statusText}</span>
              ${progressLine(progress.find(row => row.user_id === p.user_id))}
            </div>
          </div>
          <div class="participant-actions">
            ${p.status !== 'accepted' ? `<button class="button button-lime accept-p-btn" data-uid="${Number(p.user_id)}">Принять</button>` : ''}
            ${p.status !== 'rejected' ? `<button class="button button-danger reject-p-btn" data-uid="${Number(p.user_id)}">${p.status === 'accepted' ? 'Исключить' : 'Отклонить'}</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.accept-p-btn').forEach(btn => {
      btn.addEventListener('click', () => run(async () => {
        await api.post(`/streams/${streamId}/participants/${btn.dataset.uid}/accept`, {});
        await window.refreshCuratorParticipants();
      }, `Заявка ученика #${btn.dataset.uid} принята.`));
    });

    grid.querySelectorAll('.reject-p-btn').forEach(btn => {
      btn.addEventListener('click', () => run(async () => {
        await api.post(`/streams/${streamId}/participants/${btn.dataset.uid}/reject`, {});
        await window.refreshCuratorParticipants();
      }, `Заявка ученика #${btn.dataset.uid} отклонена.`));
    });
  };

  // The first load is triggered by the stream picker once the curator's streams arrive.
  card.querySelector('[data-load-target="participants"]')?.addEventListener('click', () => registerLoader(window.refreshCuratorParticipants));
}

/* ==========================================================================
   EXPLAINABLE RATING (student/index.html, course page, leaderboard)
   ========================================================================== */
const STEP_STATUS = {
  passed: { label: 'Зачтён', css: 'status-done' },
  failed: { label: 'Не зачтён', css: 'status-failed' },
  pending: { label: 'На проверке', css: 'status-review' },
  not_started: { label: 'Не начат', css: 'status-idle' }
};

const nextStepUrl = course => `/student/course/tasks.html?course=${Number(course.course_id)}&task=${Number(course.next_step.task_id)}`;

const nextStepLabel = step => `${step.step_number ? `Шаг ${escapeHtml(step.step_number)} · ` : ''}${escapeHtml(step.title)}`;

// Shows where every point came from, so the number is never unexplained.
function renderRatingBreakdown(rating) {
  const body = document.querySelector('[data-rating-body]');
  if (!body) return;
  if (!rating.courses.length) {
    body.innerHTML = '<p style="color:var(--muted);">Вы пока не зачислены ни в один поток. <a href="catalog.html">Выберите курс в каталоге</a> и подайте заявку.</p>';
    return;
  }
  const courseBlock = course => {
    const lag = course.expected_percent - course.percent;
    const pace = lag >= 20
      ? `<span class="status status-failed">Отставание от графика: ${lag}%</span>`
      : '<span class="status status-done">Идёте по графику</span>';
    const next = course.next_step
      ? `<a class="button button-dark" href="${nextStepUrl(course)}">Дальше: ${nextStepLabel(course.next_step)}</a>`
      : course.pending
        ? '<span class="status status-review">Все шаги сданы, ждём оценку куратора</span>'
        : '<span class="status status-done">Курс пройден</span>';
    return `<article class="card" style="margin-top:14px;">
      <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start;">
        <div>
          <h3 style="margin:0 0 4px;">${escapeHtml(course.course_title)}</h3>
          <span style="font-size:12px; color:var(--muted);">${escapeHtml(course.stream_name)}</span>
        </div>
        <div style="text-align:right;">
          <strong style="font-size:20px;">${course.points} баллов</strong>
          <span style="display:block; font-size:12px; color:var(--muted);">Место ${course.rank} из ${course.participants} в потоке</span>
        </div>
      </div>
      <p style="margin:12px 0 6px; font-size:13px;">Пройдено ${course.passed} из ${course.total} ${plural(course.total, 'шага', 'шагов', 'шагов')} (${course.percent}%). По графику потока к сегодняшнему дню — ${course.expected_percent}%.</p>
      <div class="progress"><span style="width:${course.percent}%"></span></div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin:14px 0 4px;">${pace} ${next}</div>
      <details style="margin-top:10px;">
        <summary style="cursor:pointer; font-weight:700; font-size:13px;">Разбивка по шагам</summary>
        <div class="table-responsive">
          <table class="leaderboard-table" style="margin-top:8px;">
            <thead><tr><th>Шаг</th><th>Проверка</th><th>Статус</th><th style="text-align:right;">Баллы</th></tr></thead>
            <tbody>${course.steps.map(step => `<tr>
              <td>${nextStepLabel(step)}</td>
              <td>${step.check === 'curator' ? 'Куратор' : 'Автоматически'}</td>
              <td><span class="status ${STEP_STATUS[step.status].css}">${STEP_STATUS[step.status].label}${step.grade > 0 ? ` · ${step.grade}` : ''}</span></td>
              <td style="text-align:right; font-weight:700;">${step.points}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </details>
    </article>`;
  };
  body.innerHTML = `
    <p style="margin:0 0 4px;">Всего: <strong>${rating.total_points} баллов</strong>.</p>
    <ul style="margin:6px 0 0; padding-left:18px; font-size:13px; color:var(--muted); line-height:1.6;">
      ${rating.rules.map(rule => `<li>${escapeHtml(rule)}</li>`).join('')}
    </ul>
    ${rating.courses.map(courseBlock).join('')}`;
}

/* ==========================================================================
   DELUXE FEATURE 6: STUDENT DASHBOARD RICH FEEDS (student/index.html)
   ========================================================================== */
function initStudentDashboard() {
  if (!window.location.pathname.includes('/student/index.html') && !window.location.pathname.endsWith('/student/')) return;

  // Progress, points and the next step come from one source: GET /users/me/rating.
  registerLoader(async () => {
    const rating = await api.get('/users/me/rating');
    const courses = rating.courses;
    const total = courses.reduce((sum, item) => sum + item.total, 0);
    const completed = courses.reduce((sum, item) => sum + item.passed, 0);
    const percent = total ? Math.round(completed / total * 100) : 0;
    const percentEl = document.querySelector('[data-overall-percent]');
    if (percentEl) percentEl.textContent = `${percent}%`;
    const progressEl = document.querySelector('[data-overall-progress]');
    if (progressEl) progressEl.style.width = `${percent}%`;
    const completedEl = document.querySelector('[data-completed-count]');
    if (completedEl) completedEl.textContent = String(completed);
    const badgeEl = document.querySelector('[data-student-steps-count]');
    if (badgeEl) badgeEl.textContent = `${completed} ${plural(completed, 'шаг', 'шага', 'шагов')}`;
    const xpEl = document.querySelector('[data-load="/users/me/rating"]');
    if (xpEl) xpEl.textContent = `${rating.total_points} XP`;
    const openLink = document.querySelector('[data-open-current-course]');
    const current = courses.find(item => item.next_step);
    if (openLink) openLink.href = current ? nextStepUrl(current) : 'catalog.html';
    const list = document.querySelector('[data-course-progress-list]');
    if (list) {
      list.innerHTML = courses.length ? courses.map(item => `<div class="radar-metric-item">
        <div class="radar-metric-header"><span>${escapeHtml(item.course_title)}</span><span>${item.passed} / ${item.total}</span></div>
        <div class="radar-metric-bar"><div class="radar-metric-fill" style="width:${item.percent}%"></div></div>
      </div>`).join('') : 'Вы пока не записаны на курсы.';
    }
    const radar = document.getElementById('radar-svg-container');
    if (courses.length >= 3) {
      renderSkillRadarSvg(courses.map(item => ({ label: courseType(item.course_type).short, value: item.percent / 100, display: `${item.percent}%` })));
    } else if (radar) {
      radar.replaceChildren();
    }
    renderRatingBreakdown(rating);
  });

  const schedPre = document.querySelector('[data-load="/users/me/schedule"]');
  if (schedPre) {
    api.get('/users/me/schedule').then(items => {
      if (!items || items.length === 0) {
        schedPre.outerHTML = '<p style="color:var(--muted); font-size:13px; padding:8px 0;">Учебный маршрут пока пуст.</p>';
        return;
      }
      const html = `<div class="interactive-feed-list">` + items.map(item => `
        <div class="feed-item">
          <div>
            <div class="feed-title">${escapeHtml(item.course_title || item.stream_name || 'Занятие')}</div>
            <div class="feed-meta">Куратор: ${escapeHtml(item.curator_name || 'Назначается')}</div>
          </div>
          <a class="button button-soft" style="min-height:32px; padding:0 10px; font-size:11px;" href="${item.course_id ? `course/index.html?course=${Number(item.course_id)}` : 'courses.html'}">
            К курсу
          </a>
        </div>
      `).join('') + `</div>`;
      schedPre.outerHTML = html;
    }).catch(() => {});
  }

  const histPre = document.querySelector('[data-load="/users/me/history"]');
  if (histPre) {
    api.get('/users/me/history').then(items => {
      if (!items || items.length === 0) {
        histPre.outerHTML = '<p style="color:var(--muted); font-size:13px; padding:8px 0;">Вы ещё не отправляли задания.</p>';
        return;
      }
      const html = `<div class="interactive-feed-list">` + items.map(sub => {
        const statusBadge = sub.grade === -1
          ? '<span class="status status-review sub-grade">На проверке</span>'
          : `<span class="status ${isPassedSubmission(sub) ? 'status-done' : 'status-failed'} sub-grade">${Number(sub.grade || 0)} / 100</span>`;

        return `
          <div class="feed-item">
            <div>
              <div class="feed-title">${sub.step_number ? `Шаг ${escapeHtml(sub.step_number)} · ` : ''}${escapeHtml(sub.task_title || `Задание #${sub.task_id}`)} · ${escapeHtml(stepLabel(sub.task_type))}</div>
              <div class="feed-meta">${escapeHtml(sub.feedback_message || 'Решение сохранено')}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              ${statusBadge}
              <a class="button button-soft" style="min-height:30px; padding:0 10px; font-size:11px;" href="course/tasks.html?course=${Number(sub.course_id || 0)}&task=${Number(sub.task_id)}">
                Открыть
              </a>
            </div>
          </div>
        `;
      }).join('') + `</div>`;
      histPre.outerHTML = html;
    }).catch(() => {});
  }
}

/* ==========================================================================
   DELUXE FEATURE 7: COURSES CATALOG & MODULES HYDRATION
   ========================================================================== */
// 1. My Courses Grid (courses.html)
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

// 2. Catalog Grid (catalog.html)
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

// 3. Course Modules Overview (course/index.html)
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

// 3b. Stream applications for students without access (course/index.html)
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

// 3c. Where the student is in this course and what to do next (course/index.html)
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

// 4. Lessons Page Navigator & Reader (course/lessons.html)
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

    // Pick active module
    let activeModule = modules.find(m => m.id === activeModuleId) || modules[0];
    activeModuleId = activeModule.id;

    const getModuleTasks = mod => tasks.filter(t => t.module_id === mod.id);

    let modTasks = getModuleTasks(activeModule);

    // Pick active step
    let activeStep = modTasks.find(t => t.id === activeTaskId) || modTasks[0];

    const sidebarTitle = document.querySelector('[data-sidebar-module-title]');
    const sidebarDesc = document.querySelector('[data-sidebar-module-desc]');
    const lessonNav = document.querySelector('[data-lesson-nav]');
    const lessonMain = document.querySelector('[data-lesson-main]');


    // Render Module Switcher in sidebar
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

      // Parse and format description
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

// Preserve course parameter across intra-course navigation
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

document.querySelectorAll('button[data-theme]').forEach(button => {
  button.addEventListener('click', () => {
    applyTheme(button.dataset.theme, true);
  });
});

updateThemeToggleButtons(getActiveTheme() === 'dark');

/* ==========================================================================
   DELUXE FEATURE 8: WOW FEATURES (SKILL RADAR, AUDIO GUIDE, AI INSPECTOR, TICKER)
   ========================================================================== */

/* --- 1. Dynamic Skill Radar SVG --- */
function renderSkillRadarSvg(metrics) {
  const container = document.getElementById('radar-svg-container');
  if (!container || !metrics?.length) return;

  const width = 280;
  const height = 250;
  const cx = width / 2;
  const cy = height / 2 + 5;
  const radius = 78;

  const total = metrics.length;
  const getCoordinates = (r, i) => {
    const angle = -Math.PI / 2 + i * (2 * Math.PI / total);
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  };

  const rings = [0.25, 0.5, 0.75, 1.0];
  const ringsHtml = rings.map(scale => {
    const points = Array.from({ length: total }, (_, i) => {
      const pt = getCoordinates(radius * scale, i);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');
    const isOuter = scale === 1.0;
    return `<polygon points="${points}" fill="${isOuter ? 'rgba(21, 33, 28, 0.4)' : 'none'}" stroke="${isOuter ? '#2f493b' : '#1e3026'}" stroke-width="1" stroke-dasharray="${isOuter ? 'none' : '2,2'}" />`;
  }).join('');

  const axesHtml = Array.from({ length: total }, (_, i) => {
    const pt = getCoordinates(radius, i);
    return `<line x1="${cx}" y1="${cy}" x2="${pt.x.toFixed(1)}" y2="${pt.y.toFixed(1)}" stroke="#283e32" stroke-width="1" />`;
  }).join('');

  const dataPoints = metrics.map((m, i) => {
    const pt = getCoordinates(radius * m.value, i);
    return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }).join(' ');

  const dotsHtml = metrics.map((m, i) => {
    const pt = getCoordinates(radius * m.value, i);
    return `
      <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4" fill="#b8f34a" stroke="#15211c" stroke-width="2">
        <title>${escapeHtml(m.label)}: ${escapeHtml(m.display)}</title>
      </circle>
    `;
  }).join('');

  const labelsHtml = metrics.map((m, i) => {
    const pt = getCoordinates(radius + 18, i);
    let anchor = 'middle';
    if (pt.x < cx - 12) anchor = 'end';
    else if (pt.x > cx + 12) anchor = 'start';
    return `<text x="${pt.x.toFixed(1)}" y="${(pt.y + 3).toFixed(1)}" fill="#8c9e94" font-size="9" font-family="monospace" text-anchor="${anchor}">${escapeHtml(m.label)}</text>`;
  }).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="overflow:visible;">
      <defs>
        <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#b8f34a" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#7caf22" stop-opacity="0.12" />
        </radialGradient>
      </defs>
      ${ringsHtml}
      ${axesHtml}
      <polygon points="${dataPoints}" fill="url(#radarGrad)" stroke="#b8f34a" stroke-width="2.5" stroke-linejoin="round" />
      ${dotsHtml}
      ${labelsHtml}
    </svg>
  `;
}

/* --- 4. Global Live Activity Ticker --- */
function initLiveTicker() {
  if (document.getElementById('platform-live-ticker')) return;

  const ticker = document.createElement('div');
  ticker.id = 'platform-live-ticker';
  ticker.className = 'live-ticker';
  ticker.innerHTML = `
    <div class="ticker-content">
      <span class="ticker-ping"></span>
      <span id="ticker-msg-text">Теория · контрольные вопросы · проекты · задачи с тестами</span>
    </div>
    <div style="opacity:0.6; font-size:10px; font-family:monospace; display:flex; gap:12px;">
      <span>PIXELSTART</span>
      <span>УЧЕБНЫЙ МАРШРУТ</span>
    </div>
  `;

  document.body.prepend(ticker);

  const messages = ['Теория · контрольные вопросы · проекты · задачи с тестами'];
  // Catalog facts come from the API, not from hardcoded numbers.
  getCourses().then(courses => {
    if (!courses.length) return;
    messages.unshift(
      `${courses.length} ${plural(courses.length, 'курс', 'курса', 'курсов')} в каталоге`,
      courses.map(course => course.title).join(' · ')
    );
  }).catch(() => {});

  let idx = 0;
  const msgEl = ticker.querySelector('#ticker-msg-text');
  setInterval(() => {
    idx = (idx + 1) % messages.length;
    if (msgEl) {
      msgEl.style.opacity = '0';
      msgEl.style.transition = 'opacity 0.25s ease';
      setTimeout(() => {
        msgEl.textContent = messages[idx];
        msgEl.style.opacity = '1';
      }, 250);
    }
  }, 6000);
}

/* ==========================================================================
   NOTIFICATIONS: bell dropdown, notifications page, unread toast
   Curator broadcasts from GET /users/me/broadcasts (newest first). "Read" is
   remembered in this browser (localStorage).
   ========================================================================== */
const READ_KEY = 'pixelstart_read_broadcasts';
const TOASTED_KEY = 'pixelstart_toasted_broadcast';

const readBroadcastIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

const markBroadcastsRead = ids => {
  const read = readBroadcastIds();
  ids.forEach(id => read.add(Number(id)));
  localStorage.setItem(READ_KEY, JSON.stringify([...read]));
};

const byNewest = items => [...items].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

const notificationCategory = {
  urgent: ['Срочно', 'status-failed'],
  webinar: ['Вебинар', 'status-progress'],
  analytics: ['Аналитика', 'status-done'],
  update: ['Обновление', 'status-review']
};

const notificationDate = value => value
  ? new Date(value).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '';

// Where "Все уведомления" leads: curators manage their broadcasts, others read the feed.
const notificationsPageUrl = role => (role === 'curator' ? '/curator/broadcast.html' : '/student/notifications.html');

function notificationCard(item, read, { compact = false } = {}) {
  const [label, css] = notificationCategory[item.category] || notificationCategory.update;
  return `<article class="notif-item ${read ? 'is-read' : ''}" data-notification="${Number(item.id)}">
    <div class="notif-item-head">
      <span class="status ${css}">${label}</span>
      <span class="notif-date">${escapeHtml(notificationDate(item.timestamp))}</span>
    </div>
    <strong class="notif-title">${escapeHtml(item.title || 'Объявление')}</strong>
    ${compact ? '' : `<p class="notif-text">${escapeHtml(item.text)}</p>`}
    <div class="notif-meta">
      <span>${escapeHtml(item.author_name || 'Куратор')} · ${escapeHtml(item.stream_name || '')}</span>
      ${read ? '<span>Прочитано</span>' : `<button class="button button-soft button-sm" type="button" data-mark-read="${Number(item.id)}">Прочитано</button>`}
    </div>
  </article>`;
}

function initNotifications() {
  if (!api.auth.access) return;
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;

  let actions = topbar.querySelector('.top-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'top-actions';
    topbar.appendChild(actions);
  }
  let bell = document.getElementById('btn-topbar-broadcasts');
  if (!bell) {
    bell = document.createElement('button');
    bell.className = 'topbar-broadcast-btn';
    bell.id = 'btn-topbar-broadcasts';
    bell.type = 'button';
    bell.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="broadcast-badge-count" id="header-broadcast-badge" hidden>0</span>`;
    actions.prepend(bell);
  }
  bell.title = 'Уведомления';
  bell.setAttribute('aria-haspopup', 'true');
  bell.setAttribute('aria-expanded', 'false');
  const badge = document.getElementById('header-broadcast-badge');

  const wrap = document.createElement('div');
  wrap.className = 'notif-anchor';
  bell.replaceWith(wrap);
  wrap.append(bell);
  const panel = document.createElement('div');
  panel.className = 'notif-dropdown';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Последние уведомления');
  wrap.append(panel);

  let items = [];
  const toggle = open => {
    panel.hidden = !open;
    bell.setAttribute('aria-expanded', String(open));
  };

  const render = async () => {
    const [list, user] = await Promise.all([api.get('/users/me/broadcasts'), getCurrentUser()]);
    items = byNewest(list);
    const read = readBroadcastIds();
    const unread = items.filter(item => !read.has(item.id));
    if (badge) {
      badge.hidden = !unread.length;
      badge.style.display = unread.length ? 'inline-flex' : 'none';
      badge.textContent = unread.length > 9 ? '9+' : String(unread.length);
    }
    panel.innerHTML = `
      <div class="notif-dropdown-head">
        <strong>Уведомления</strong>
        ${unread.length ? `<button class="notif-link" type="button" data-mark-all>Прочитать все</button>` : ''}
      </div>
      <div class="notif-dropdown-list">
        ${items.length ? items.slice(0, 3).map(item => notificationCard(item, read.has(item.id), { compact: true })).join('')
          : '<p class="notif-empty">Новых объявлений нет.</p>'}
      </div>
      <a class="button button-dark notif-all" href="${notificationsPageUrl(user.role)}">Все уведомления</a>`;

    // Toast once for every new unread notification, not on each page load.
    const newest = unread[0];
    if (newest && Number(localStorage.getItem(TOASTED_KEY) || 0) < newest.id) {
      localStorage.setItem(TOASTED_KEY, String(newest.id));
      showMessage(unread.length === 1
        ? 'У вас непрочитанное уведомление от куратора.'
        : `У вас ${unread.length} ${plural(unread.length, 'непрочитанное уведомление', 'непрочитанных уведомления', 'непрочитанных уведомлений')}.`);
    }
  };

  bell.addEventListener('click', event => {
    event.stopPropagation();
    toggle(panel.hidden);
  });
  document.addEventListener('click', event => {
    if (!wrap.contains(event.target)) toggle(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') toggle(false);
  });
  panel.addEventListener('click', event => {
    const one = event.target.closest('[data-mark-read]');
    const all = event.target.closest('[data-mark-all]');
    if (!one && !all) return;
    event.stopPropagation();
    markBroadcastsRead(all ? items.map(item => item.id) : [one.dataset.markRead]);
    refreshPageData();
  });

  registerLoader(render);
}

/* Full notifications list (student/notifications.html), newest first. */
function initNotificationsPage() {
  const mount = document.querySelector('[data-notifications-list]');
  if (!mount) return;
  let filter = 'all';

  registerLoader(async () => {
    const items = byNewest(await api.get('/users/me/broadcasts'));
    const read = readBroadcastIds();
    const unreadCount = items.filter(item => !read.has(item.id)).length;
    document.querySelectorAll('[data-notif-filter]').forEach(button => {
      button.classList.toggle('active', button.dataset.notifFilter === filter);
    });
    const counter = document.querySelector('[data-notif-unread-count]');
    if (counter) counter.textContent = String(unreadCount);
    const visible = filter === 'unread' ? items.filter(item => !read.has(item.id)) : items;
    mount.innerHTML = visible.length
      ? visible.map(item => notificationCard(item, read.has(item.id))).join('')
      : `<div class="empty-state-box">${filter === 'unread' ? 'Все уведомления прочитаны.' : 'Кураторы ещё не публиковали объявлений в ваших потоках.'}</div>`;
    mount.dataset.ids = items.map(item => item.id).join(',');
  });

  document.querySelectorAll('[data-notif-filter]').forEach(button => {
    button.addEventListener('click', () => {
      filter = button.dataset.notifFilter;
      refreshPageData();
    });
  });
  document.querySelector('[data-notif-read-all]')?.addEventListener('click', () => {
    markBroadcastsRead((mount.dataset.ids || '').split(',').filter(Boolean));
    refreshPageData();
  });
  mount.addEventListener('click', event => {
    const one = event.target.closest('[data-mark-read]');
    if (!one) return;
    markBroadcastsRead([one.dataset.markRead]);
    refreshPageData();
  });
}

/* ==========================================================================
   UNIFIED MODULE: INTERACTIVE STUDENT SCHEDULE PAGE (student/schedule.html)
   ========================================================================== */
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

/* ==========================================================================
   UNIFIED MODULE: GAMIFIED STUDENT LEADERBOARD (student/leaderboard.html)
   ========================================================================== */
function initStudentLeaderboardPage() {
  const tbody = document.getElementById('leaderboard-tbody');
  const podiumMount = document.getElementById('leaderboard-podium');
  if (!tbody && !podiumMount) return;

  Promise.all([api.get('/users/leaderboard'), getCurrentUser().catch(() => null)]).then(([data, currentUser]) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--muted);">Рейтинговая таблица пока формируется.</td></tr>`;
      return;
    }

    const currentUserName = currentUser?.username || '';

    // 1. Render Top 3 Podium
    if (podiumMount) {
      const top3 = data.slice(0, 3);
      const order = [top3[1], top3[0], top3[2]].filter(Boolean);

      podiumMount.innerHTML = order.map(p => {
        const isGold = p.rank === 1;
        const isSilver = p.rank === 2;
        const isBronze = p.rank === 3;
        const placeClass = isGold ? 'podium-first' : (isSilver ? 'podium-second' : 'podium-third');
        const medalColor = isGold ? '#ffd700' : (isSilver ? '#c0c0c0' : '#cd7f32');
        const label = isGold ? '1 МЕСТО' : (isSilver ? '2 МЕСТО' : '3 МЕСТО');

        return `
          <div class="podium-card ${placeClass}">
            <div class="podium-avatar-wrap">
              <div class="podium-avatar-ring" style="border-color:${medalColor};">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${medalColor}" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div class="podium-crown-badge" style="background:${medalColor}; color:#000;">
                ${p.rank}
              </div>
            </div>
            <div class="podium-user-name">${escapeHtml(p.full_name || p.username)}</div>
            <div class="podium-league-tag">${escapeHtml(p.league_name || p.league_title || 'Серебряная лига')}</div>
            <div class="podium-xp-score">${Number(p.total_xp ?? p.xp ?? 0)} XP</div>
            <div class="podium-stand-box">
              <span class="podium-stand-rank">${label}</span>
              <span class="podium-stand-streak">Зачтено: ${Number(p.tasks_completed || 0)}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // 2. Render Full Table
    let currentFilter = 'all';

    const renderTable = () => {
      if (!tbody) return;

      const filtered = data.filter(u => {
        if (currentFilter === 'all') return true;
        const l = (u.league || '').toLowerCase();
        return l === currentFilter;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--muted);">В этой лиге пока нет участников.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(u => {
        const isCurrent = u.username === currentUserName;
        const leagueClass = (u.league || 'silver').toLowerCase();

        return `
          <tr class="leaderboard-row ${isCurrent ? 'current-user-highlight' : ''}">
            <td style="text-align:center; font-weight:800; font-size:15px; color:${u.rank <= 3 ? 'var(--accent)' : 'var(--muted)'};">
              #${u.rank}
            </td>
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <div class="student-table-avatar">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div>
                  <div style="font-weight:700; color:var(--text);">${escapeHtml(u.full_name || u.username)} ${isCurrent ? '<span class="status status-done" style="font-size:10px; margin-left:4px;">Вы</span>' : ''}</div>
                  <div style="font-size:11px; color:var(--muted);">@${escapeHtml(u.username)}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="league-pill league-${leagueClass}">${escapeHtml(u.league_name || u.league_title || 'Серебряная лига')}</span>
            </td>
            <td style="text-align:center; font-weight:700; color:var(--text);">
              ${u.tasks_completed || 0}
            </td>
            <td style="text-align:right; padding-right:24px; font-weight:800; font-size:15px; color:var(--lime-dark);">
              ${Number(u.total_xp ?? u.xp ?? 0)} XP
            </td>
          </tr>
        `;
      }).join('');
    };

    renderTable();

    // 3. Setup League Tabs
    const tabs = document.getElementById('leaderboard-tabs');
    if (tabs) {
      tabs.querySelectorAll('.chip-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          tabs.querySelectorAll('.chip-toggle').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentFilter = btn.dataset.filter || 'all';
          renderTable();
        });
      });
    }

    // 4. Current student's position from the same leaderboard data.
    const stickyBar = document.getElementById('student-sticky-rank');
    const myData = data.find(u => u.username === currentUserName);
    if (stickyBar && myData) {
      const completedBadge = document.querySelector('[data-leaderboard-completed]');
      if (completedBadge) completedBadge.textContent = `${Number(myData.tasks_completed || 0)} ${plural(Number(myData.tasks_completed || 0), 'задача', 'задачи', 'задач')}`;
      stickyBar.innerHTML = `
        <div class="rank-stat">
          <span class="rank-num">#${Number(myData.rank)}</span>
          <div>
            <strong>Ваша позиция</strong>
            <span style="display:block; font-size:11px; color:var(--muted);">${escapeHtml(myData.league_title || 'Серебряная лига')} · ${Number(myData.tasks_completed || 0)} ${plural(Number(myData.tasks_completed || 0), 'зачтённое задание', 'зачтённых задания', 'зачтённых заданий')}</span>
          </div>
        </div>
        <strong style="font-size:18px; color:var(--lime-dark);">${Number(myData.total_xp ?? myData.xp ?? 0)} XP</strong>
      `;
      stickyBar.style.display = 'flex';
    } else if (stickyBar) {
      stickyBar.style.display = 'none';
    }
  }).catch(() => {});
}

/* ==========================================================================
   UNIFIED MODULE: CURATOR ALERTS & RETENTION RADAR (curator/index.html)
   ========================================================================== */
function initCuratorAlertsRadar() {
  if (!window.location.pathname.includes('/curator/')) return;

  api.get('/panel/stats/curator-alerts').then(res => {
    if (!res) return;

    const activeCount = res.active_students ?? res.active_students_count ?? 0;
    const pendingCount = res.pending_count !== undefined ? res.pending_count : (res.pending_submissions ? res.pending_submissions.length : 0);

    const statStudents = document.getElementById('curator-stat-students');
    if (statStudents) {
      statStudents.textContent = `${activeCount} учеников`;
    }

    const statSubmissions = document.getElementById('curator-stat-submissions');
    if (statSubmissions) {
      statSubmissions.textContent = `${pendingCount} на проверке`;
    }

    const radarEl = document.getElementById('curator-alerts-radar');
    if (radarEl) {
      radarEl.innerHTML = `
        <div class="card" style="padding:20px; border-left:4px solid var(--accent); margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <span class="status status-review">Радар куратора</span>
              <h3 style="margin:6px 0 2px; font-size:16px;">В очереди ${pendingCount} работ, требующих рецензии</h3>
              <p style="font-size:12px; color:var(--muted); margin:0;">Откройте очередь, оцените проект и оставьте ученику конкретный отзыв.</p>
            </div>
            <a class="button button-lime" style="min-height:36px; padding:0 16px; font-weight:700;" href="review.html">
              Перейти к проверке
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle; margin-left:4px;"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>
        </div>
      `;
    }
  }).catch(() => {});
  api.get('/users/me/streams').then(streams => {
    const count = document.getElementById('curator-stat-streams');
    if (count) count.textContent = String(streams.length);
  }).catch(() => {});
}

/* ==========================================================================
   ADMIN DASHBOARD STATS (admin/index.html)
   ========================================================================== */
function initAdminStats() {
  if (!document.querySelector('[data-admin-stat]')) return;

  const setStat = (key, value, label) => {
    const valueEl = document.querySelector(`[data-admin-stat="${key}"]`);
    const labelEl = document.querySelector(`[data-admin-stat-label="${key}"]`);
    if (valueEl) valueEl.textContent = value;
    if (labelEl) labelEl.textContent = label;
  };

  registerLoader(async () => {
    const [users, courses, streams] = await Promise.all([
      api.get('/panel/users?limit=100'),
      api.get('/courses?limit=100'),
      api.get('/streams?limit=100')
    ]);
    const byRole = role => users.filter(user => user.role === role).length;
    const usersCount = users.length === 100 ? '100+' : String(users.length);
    setStat('users', `${usersCount} ${plural(users.length, 'аккаунт', 'аккаунта', 'аккаунтов')}`,
      `Учеников: ${byRole('student')}, кураторов: ${byRole('curator')}, админов: ${byRole('admin')}`);
    setStat('courses', `${courses.length} ${plural(courses.length, 'курс', 'курса', 'курсов')}`,
      courses.map(course => courseType(course.type).short).join(', ') || 'Каталог пуст');
    const now = Date.now();
    const active = streams.filter(stream => new Date(stream.start_date) <= now && now <= new Date(stream.end_date));
    setStat('streams', `${active.length} ${plural(active.length, 'активный', 'активных', 'активных')}`,
      `Всего потоков: ${streams.length}`);
  });
}

/* ==========================================================================
   STUDENT PROFILE OVERVIEW (student/profile.html)
   ========================================================================== */
function initStudentProfilePage() {
  const mount = document.getElementById('profile-view-mount');
  if (!mount) return;
  registerLoader(async () => {
    const user = await getCurrentUser();
    const isStudent = user.role === 'student';
    // Learning progress and rating exist only for students; staff see their streams instead.
    const [rating, streams, leaderboard] = await Promise.all([
      isStudent ? api.get('/users/me/rating') : null,
      api.get('/users/me/streams'),
      isStudent ? api.get('/users/leaderboard').catch(() => []) : []
    ]);
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username[0].toUpperCase();
    const streamsBox = label => `
        <div class="profile-stat-box">
          <span class="profile-stat-val">${streams.length}</span>
          <span class="profile-stat-label">${label}</span>
        </div>`;
    let stats;
    if (isStudent) {
      const passed = rating.courses.reduce((sum, course) => sum + course.passed, 0);
      // The league comes from the same leaderboard the student sees, so the numbers always agree.
      const place = leaderboard.find(row => row.user_id === user.id);
      const league = place
        ? `<span class="league-pill league-${escapeHtml((place.league || 'silver').toLowerCase())}">${escapeHtml(place.league_title)}</span>`
        : '—';
      stats = `
        <div class="profile-stat-box">
          <span class="profile-stat-val accent">${rating.total_points}</span>
          <span class="profile-stat-label">Баллов рейтинга</span>
        </div>
        <div class="profile-stat-box">
          <span class="profile-stat-val">${passed}</span>
          <span class="profile-stat-label">${plural(passed, 'Шаг зачтён', 'Шага зачтено', 'Шагов зачтено')}</span>
        </div>
        ${streamsBox(plural(streams.length, 'Поток обучения', 'Потока обучения', 'Потоков обучения'))}
        <div class="profile-stat-box">
          <span class="profile-stat-val">${league}</span>
          <span class="profile-stat-label">Текущая лига</span>
        </div>`;
    } else {
      stats = streamsBox(user.role === 'admin'
        ? plural(streams.length, 'Поток на платформе', 'Потока на платформе', 'Потоков на платформе')
        : plural(streams.length, 'Ваш поток', 'Ваших потока', 'Ваших потоков'));
    }
    mount.innerHTML = `
      <div class="profile-hero-card">
        <div class="profile-avatar-wrap">${escapeHtml(initials)}</div>
        <div class="profile-info">
          <div class="profile-info-header">
            <h2 class="profile-name">${escapeHtml(fullName)}</h2>
            <span class="profile-role-pill">${escapeHtml(roleLabels[user.role] || user.role)}</span>
            <span class="profile-status-pill">${user.is_verified ? 'Почта подтверждена' : 'Почта не подтверждена'}</span>
          </div>
          <div class="profile-username">@${escapeHtml(user.username)} · ID #${Number(user.id)}</div>
          <div class="profile-meta-row">
            <span class="profile-meta-item">${escapeHtml(user.email)}</span>
            ${user.description ? `<span class="profile-meta-item" style="color:var(--ink);">«${escapeHtml(user.description)}»</span>` : ''}
          </div>
        </div>
      </div>
      <div class="profile-stats-grid">${stats}
      </div>`;
  });
}

/* ==========================================================================
   ADMIN USERS TABLE WITH SEARCH (admin/users.html)
   ========================================================================== */
function initAdminUsersPage() {
  const mount = document.getElementById('admin-users-table-mount');
  if (!mount) return;
  const search = document.getElementById('users-search-input');
  const roleFilter = document.getElementById('role');
  let users = [];

  const renderTable = () => {
    const query = (search?.value || '').toLowerCase().trim();
    const filtered = users.filter(user => !query
      || `${user.first_name} ${user.last_name} ${user.username} ${user.email}`.toLowerCase().includes(query));
    const badge = document.getElementById('users-count-badge');
    if (badge) badge.textContent = `${filtered.length} ${plural(filtered.length, 'пользователь', 'пользователя', 'пользователей')}`;
    if (!filtered.length) {
      mount.innerHTML = '<div class="empty-state-box">Пользователи не найдены.</div>';
      return;
    }
    mount.innerHTML = `<div class="table-responsive"><table class="admin-data-table">
      <thead><tr>
        <th style="width:50px;">ID</th><th>Пользователь</th><th>Email</th><th>Роль</th><th>Оплата</th><th>Почта</th>
        <th style="text-align:right;">Действие</th>
      </tr></thead>
      <tbody>${filtered.map(user => `<tr>
        <td style="font-weight:700; color:var(--muted);">#${Number(user.id)}</td>
        <td>
          <div style="font-weight:700; color:var(--ink);">${escapeHtml(`${user.first_name} ${user.last_name}`.trim() || user.username)}</div>
          <div style="font-size:11px; color:var(--muted);">@${escapeHtml(user.username)}</div>
        </td>
        <td>${escapeHtml(user.email)}</td>
        <td><span class="user-badge-role ${escapeHtml(user.role)}">${escapeHtml(roleLabels[user.role] || user.role)}</span></td>
        <td><span class="user-badge-pay ${user.payment ? 'paid' : 'unpaid'}">${user.payment ? 'Оплачен' : 'Бесплатный'}</span></td>
        <td><span class="status ${user.is_verified ? 'status-done' : 'status-review'}">${user.is_verified ? 'Подтверждена' : 'Не подтверждена'}</span></td>
        <td style="text-align:right;">
          <button class="button button-soft" type="button" style="min-height:30px; padding:0 10px; font-size:11px;" data-edit-user="${Number(user.id)}">Изменить</button>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  };

  const loadUsers = async () => {
    const role = roleFilter?.value;
    users = await api.get(role ? `/panel/users?role=${encodeURIComponent(role)}&limit=100` : '/panel/users?limit=100');
    renderTable();
  };

  // "Изменить" fills the form below with the user's current values.
  mount.addEventListener('click', event => {
    const button = event.target.closest('[data-edit-user]');
    if (!button) return;
    const user = users.find(item => item.id === Number(button.dataset.editUser));
    const form = document.querySelector('[data-form="user-patch"]');
    if (!user || !form) return;
    form.user_id.value = user.id;
    form.role.value = user.role;
    form.payment.value = String(user.payment);
    if (form.is_verified) form.is_verified.value = '';
    form.user_id.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  search?.addEventListener('input', renderTable);
  roleFilter?.addEventListener('change', () => run(loadUsers));
  document.querySelector('[data-load-target="users"]')?.addEventListener('click', () => run(loadUsers, 'Список обновлён.'));
  registerLoader(loadUsers);
}

/* ==========================================================================
   ADMIN STREAM CARDS (admin/streams.html)
   ========================================================================== */
function initAdminStreamsPage() {
  const mount = document.getElementById('admin-streams-mount');
  if (!mount) return;
  const formatDay = value => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  registerLoader(async () => {
    const [streams, courses, curators] = await Promise.all([
      api.get('/streams?limit=100'),
      api.get('/courses?limit=100'),
      api.get('/panel/users?role=curator&limit=100')
    ]);
    if (!streams.length) {
      mount.innerHTML = '<div class="empty-state-box">Потоки пока не созданы. Заполните форму выше, чтобы создать первый.</div>';
      return;
    }
    const courseTitle = id => courses.find(course => course.id === id)?.title || `Курс #${id}`;
    const curatorName = id => {
      const curator = curators.find(user => user.id === id);
      return curator ? `${curator.first_name} ${curator.last_name}`.trim() : `Куратор #${id}`;
    };
    const now = Date.now();
    const state = stream => now < new Date(stream.start_date) ? ['Скоро старт', 'unpaid']
      : now > new Date(stream.end_date) ? ['Завершён', 'unpaid'] : ['Идёт обучение', 'paid'];
    mount.innerHTML = `<div class="streams-grid">${streams.map(stream => {
      const [label, css] = state(stream);
      return `<div class="stream-card">
        <div class="stream-card-head">
          <div>
            <h3 class="stream-title">${escapeHtml(stream.name)}</h3>
            <div style="font-size:12px; color:var(--muted); margin-top:2px;">${escapeHtml(courseTitle(stream.course_id))} · ${escapeHtml(curatorName(stream.curator_id))}</div>
          </div>
          <span class="stream-id-badge">ID #${Number(stream.id)}</span>
        </div>
        <div class="stream-meta-list">
          <div class="stream-meta-row"><span>Статус:</span><span class="user-badge-pay ${css}">${label}</span></div>
          <div class="stream-dates">Сроки: <strong>${formatDay(stream.start_date)}</strong> — <strong>${formatDay(stream.end_date)}</strong></div>
        </div>
      </div>`;
    }).join('')}</div>`;
  });
}

/* --- Initialization on DOM Ready --- */
document.addEventListener('DOMContentLoaded', () => {
  // The stylesheet styles dark mode via body.dark-theme, which is only reachable after parsing.
  applyTheme(getActiveTheme(), false);
  initTopbarThemeToggle();
  initLiveTicker();
  initDemoSwitcher();
  initNotifications();
  initNotificationsPage();
  initTasksPage();
  initCuratorReview();
  initCuratorParticipants();
  initCuratorAlertsRadar();
  initCuratorRiskBoard();
  initStudentDashboard();
  initStudentSchedulePage();
  initStudentLeaderboardPage();
  initAdminStats();
  initStudentProfilePage();
  initAdminUsersPage();
  initAdminStreamsPage();
  updateThemeToggleButtons(getActiveTheme() === 'dark');
});
