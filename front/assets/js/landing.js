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
