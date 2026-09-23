// Выпадающие меню открываются по клику и закрываются по Escape или вне меню.
const menuButtons = [...document.querySelectorAll('.nav-trigger')];

function closeMenus(except = null) {
  menuButtons.forEach((button) => {
    if (button === except) return;
    button.setAttribute('aria-expanded', 'false');
    document.getElementById(button.getAttribute('aria-controls')).hidden = true;
  });
}

menuButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const willOpen = button.getAttribute('aria-expanded') !== 'true';
    closeMenus(button);
    button.setAttribute('aria-expanded', String(willOpen));
    document.getElementById(button.getAttribute('aria-controls')).hidden = !willOpen;
  });
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.nav-item')) closeMenus();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMenus();
    document.querySelector('.mobile-menu').setAttribute('aria-expanded', 'false');
    document.querySelector('.main-nav').classList.remove('is-open');
  }
});

// Мобильная навигация раскрывается отдельной кнопкой.
const mobileButton = document.querySelector('.mobile-menu');
const mainNav = document.querySelector('.main-nav');

mobileButton.addEventListener('click', () => {
  const isOpen = mobileButton.getAttribute('aria-expanded') === 'true';
  mobileButton.setAttribute('aria-expanded', String(!isOpen));
  mainNav.classList.toggle('is-open', !isOpen);
});

mainNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileButton.setAttribute('aria-expanded', 'false');
    mainNav.classList.remove('is-open');
    closeMenus();
  });
});

// Плавное появление контента при прокрутке, без JS-анимаций при reduced motion.
const revealItems = document.querySelectorAll('.reveal');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => revealObserver.observe(item));
}

// Пока главная страница работает как прототип, выбор курса показывает короткий статус.
const toast = document.querySelector('.toast');
let toastTimer;

document.querySelectorAll('.course-card, .all-courses, .header-cta, .cta-content .button').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    toast.textContent = 'Скоро здесь появится выбор курса';
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2400);
  });
});
