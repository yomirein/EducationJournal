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

document.addEventListener('DOMContentLoaded', initAdminStats);
