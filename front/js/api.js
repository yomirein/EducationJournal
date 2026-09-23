const API_URL = localStorage.getItem('pixelstart_api_url') || 'http://127.0.0.1:8000';

export async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const accessToken = localStorage.getItem('pixelstart_access_token');
  
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  
  if (response.status === 204) {
    return null;
  }
  
  const payload = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(payload.detail || payload.message || `Ошибка API: ${response.status}`);
  }
  
  return payload;
}

export const api = {
  health: () => request('/health'),
  
  register: (data) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  login: (data) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  refresh: () => request(
    `/auth/refresh?refresh_token=${encodeURIComponent(localStorage.getItem('pixelstart_refresh_token') || '')}`,
    { method: 'POST' }
  ),
  
  me: () => request('/users/me'),
  
  updateMe: (data) => request('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  
  deleteMe: () => request('/users/me', {
    method: 'DELETE'
  }),
  
  rating: () => request('/users/me/rating'),
  history: () => request('/users/me/history'),
  schedule: () => request('/users/me/schedule'),
  
  courses: () => request('/courses'),
  course: (id) => request(`/courses/${id}`),
  courseTasks: (id) => request(`/courses/${id}/tasks`),
  
  submit: (courseId, taskId, data) => request(
    `/courses/${courseId}/tasks/${taskId}/submissions`,
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  ),
  
  grade: (courseId, taskId) => request(`/courses/${courseId}/tasks/${taskId}/grade`),
  
  streams: () => request('/streams'),
  
  joinStream: (id) => request(`/streams/${id}/join`, {
    method: 'POST'
  }),
  
  broadcasts: (id) => request(`/streams/${id}/broadcasts`),
  
  adminUsers: (role) => request(`/panel/users?limit=100${role ? `&role=${role}` : ''}`),
  
  adminCourses: (data) => request('/panel/courses', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  adminStreams: (data) => request('/panel/streams', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  adminPatchUser: (id, data) => request(`/panel/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  
  courseStats: (id) => request(`/panel/stats/courses/${id}`),
  streamStats: (id) => request(`/panel/stats/streams/${id}`),
  
  curatorParticipants: (id) => request(`/streams/${id}/participants`),
  
  createBroadcast: (id, text) => request(`/streams/${id}/broadcasts`, {
    method: 'POST',
    body: JSON.stringify({ text })
  }),
  
  gradeSubmission: (streamId, taskId, submissionId, data) => request(
    `/streams/${streamId}/tasks/${taskId}/submissions/${submissionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data)
    }
  ),
  
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/files', {
      method: 'POST',
      body: form
    });
  }
};

export { API_URL };
