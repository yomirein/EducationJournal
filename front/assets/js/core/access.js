document.querySelectorAll('[data-logout]').forEach(button => {
  button.addEventListener('click', () => {
    api.auth.clear();
    window.location.href = '/index.html';
  });
});

const pageAccess = {
  student: '/student/',
  curator: '/curator/',
  admin: '/admin/'
};

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
