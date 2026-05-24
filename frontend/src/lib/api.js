const TOKEN_KEY = 'rr_token';
const USER_KEY = 'rr_user';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function setStoredUser(u) {
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function request(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body !== 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body,
    });
  } catch (e) {
    throw new ApiError('Нет соединения с сервером', 0, null);
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  }

  if (!res.ok) {
    const message = (data && data.error) || `Ошибка ${res.status}`;
    throw new ApiError(message, res.status, data);
  }
  return data;
}

export const api = {
  login: (login, password) => request('/auth/login', { method: 'POST', body: { login, password } }),
  me: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: data }),

  cars: {
    list: () => request('/cars'),
    get: (id) => request(`/cars/${id}`),
    create: (data) => request('/cars', { method: 'POST', body: data }),
    update: (id, data) => request(`/cars/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/cars/${id}`, { method: 'DELETE' }),
  },

  drivers: {
    list: () => request('/drivers'),
    create: (data) => request('/drivers', { method: 'POST', body: data }),
    update: (id, data) => request(`/drivers/${id}`, { method: 'PUT', body: data }),
    resetPassword: (id, password) => request(`/drivers/${id}/reset-password`, { method: 'POST', body: { password } }),
    remove: (id) => request(`/drivers/${id}`, { method: 'DELETE' }),
  },

  trips: {
    active: () => request('/trips/active'),
    mine: (offset = 0, limit = 20) => request(`/trips/mine?offset=${offset}&limit=${limit}`),
    list: (query = {}) => {
      const qs = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => v && qs.set(k, v));
      const s = qs.toString();
      return request(`/trips${s ? `?${s}` : ''}`);
    },
    get: (id) => request(`/trips/${id}`),
    update: (id, data) => request(`/trips/${id}`, { method: 'PUT', body: data }),
    start: (data) => request('/trips/start', { method: 'POST', body: data }),
    finish: (id, data) => request(`/trips/${id}/finish`, { method: 'POST', body: data }),
  },

  refuels: {
    list: (query = {}) => {
      const qs = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => v && qs.set(k, v));
      const s = qs.toString();
      return request(`/refuels${s ? `?${s}` : ''}`);
    },
    update: (id, data) => request(`/refuels/${id}`, { method: 'PUT', body: data }),
  },

  dashboard: {
    get: (query = {}) => {
      const qs = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => v && qs.set(k, v));
      const s = qs.toString();
      return request(`/dashboard${s ? `?${s}` : ''}`);
    },
  },

  uploads: {
    async upload(blob, filename = 'photo.jpg') {
      const fd = new FormData();
      const file = blob instanceof File ? blob : new File([blob], filename, { type: blob.type || 'image/jpeg' });
      fd.append('photo', file);
      return request('/uploads', { method: 'POST', body: fd });
    },
  },
};
