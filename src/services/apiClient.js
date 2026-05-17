const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('Missing VITE_API_URL environment variable');
}
const TOKEN_KEY = 'plashcard_token';
const USER_KEY = 'plashcard_user';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),
  getUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  removeUser: () => localStorage.removeItem(USER_KEY),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export async function apiRequest(path, options = {}) {
  const token = authStorage.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body:
      options.body && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.success === false) {
    const error = new Error(json.message || 'Request failed');
    error.status = res.status;
    error.data = json;
    throw error;
  }

  return json.data;
}
