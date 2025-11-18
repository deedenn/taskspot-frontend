import { apiRequest, setAuthToken, clearAuthToken } from './client';

export async function loginApi({ email, password }) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(data.token);
  return data;
}

export async function registerApi({ name, email, password, inviteToken }) {
  const payload = { name, email, password };
  if (inviteToken) payload.inviteToken = inviteToken;

  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setAuthToken(data.token);
  return data;
}

export async function meApi() {
  return apiRequest('/auth/me', { method: 'GET' });
}

export function logoutApi() {
  clearAuthToken();
}
