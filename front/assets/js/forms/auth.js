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
