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
