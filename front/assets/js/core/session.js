let currentUserRequest = null;

// Returns the signed-in user; pass fresh=true after the profile changes.
const getCurrentUser = (fresh = false) => {
  if (!api.auth.access) return Promise.reject(new Error('Войдите в аккаунт, чтобы открыть эту страницу.'));

  if (fresh || !currentUserRequest) {
    currentUserRequest = api.get('/users/me');
    currentUserRequest.catch(() => { currentUserRequest = null; });
  }

  return currentUserRequest;
};

let coursesRequest = null;

const getCourses = () => {
  if (!coursesRequest) {
    coursesRequest = api.get('/courses');
    coursesRequest.catch(() => { coursesRequest = null; });
  }

  return coursesRequest;
};

const homeForRole = role => ({ curator: '/curator/index.html', admin: '/admin/index.html' }[role] || '/student/index.html');
