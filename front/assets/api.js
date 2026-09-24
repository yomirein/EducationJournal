(() => {
const API_BASE = window.PIXELSTART_API || (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http') ? window.location.origin : 'http://127.0.0.1:8000');

const auth = {
  get access() {
    return localStorage.getItem('pixelstart_access');
  },
  get refresh() {
    return localStorage.getItem('pixelstart_refresh');
  },
  save(tokens) {
    localStorage.setItem('pixelstart_access', tokens.access_token);
    localStorage.setItem('pixelstart_refresh', tokens.refresh_token);
  },
  clear() {
    localStorage.removeItem('pixelstart_access');
    localStorage.removeItem('pixelstart_refresh');
    localStorage.removeItem('pixelstart_user');
  }
};

async function request(path, options = {}, canRefresh = true) {
  const headers = new Headers(options.headers || {});
  
  if (!(options.body instanceof FormData) && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (auth.access) {
    headers.set('Authorization', `Bearer ${auth.access}`);
  }
  
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  
  if (response.status === 401 && canRefresh && auth.refresh) {
    const refreshResponse = await fetch(
      `${API_BASE}/auth/refresh?refresh_token=${encodeURIComponent(auth.refresh)}`,
      { method: 'POST' }
    );
    
    if (refreshResponse.ok) {
      auth.save(await refreshResponse.json());
      return request(path, options, false);
    }
    
    auth.clear();
  }
  
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || `API error ${response.status}`);
  }
  
  return response.status === 204 ? null : response.json();
}

const api = {
  get: path => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: path => request(path, { method: 'DELETE' }),
  upload: (path, form) => request(path, { method: 'POST', body: form }),
  auth
};

window.pixelApi = api;
})();
