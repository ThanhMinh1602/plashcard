import { apiRequest, authStorage } from './apiClient';

export async function loginWithEmail(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  authStorage.setToken(data.token);
  authStorage.setUser(data.user);
  window.dispatchEvent(new Event('auth-changed'));
  return data.user;
}

export async function registerWithEmail(email, password) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: { email, password },
  });
  authStorage.setToken(data.token);
  authStorage.setUser(data.user);
  window.dispatchEvent(new Event('auth-changed'));
  return data.user;
}

export async function getCurrentUser() {
  const token = authStorage.getToken();
  if (!token) return null;

  try {
    const data = await apiRequest('/auth/me');
    authStorage.setUser(data.user);
    return data.user;
  } catch (error) {
    authStorage.clear();
    return null;
  }
}

export function getCachedUser() {
  return authStorage.getUser();
}

export function logout() {
  authStorage.clear();
  window.dispatchEvent(new Event('auth-changed'));
}

export async function forgotPassword(email) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}
