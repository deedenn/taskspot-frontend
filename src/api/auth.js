import { apiRequest, setAuthToken, clearAuthToken, getAuthToken } from './client';

export async function loginApi({ email, password }) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data?.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function registerApi({ name, email, password, inviteToken }) {
  const payload = { name, email, password };
  if (inviteToken) {
    payload.inviteToken = inviteToken;
  }
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (data?.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function getCurrentUserApi() {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Нет токена');
  }
  const data = await apiRequest('/auth/me', {
    method: 'GET',
  });
  return data;
}

export function logout() {
  clearAuthToken();
}
