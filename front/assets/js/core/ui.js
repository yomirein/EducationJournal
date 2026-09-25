const api = window.pixelApi;
const toast = document.querySelector('.toast');

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
