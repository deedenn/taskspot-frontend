const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000';

const TOKEN_KEY = 'taskspot_token';

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // тело может быть пустым
  }

  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.message || 'Ошибка запроса к API',
      data,
    };
  }

  return data;
}
