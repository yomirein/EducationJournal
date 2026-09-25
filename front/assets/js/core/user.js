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
