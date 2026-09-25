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
