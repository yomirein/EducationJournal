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

document.addEventListener('DOMContentLoaded', initAdminUsersPage);
