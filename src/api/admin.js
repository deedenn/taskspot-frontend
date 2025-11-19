import { apiRequest } from './client';

export function fetchGlobalStatsApi() {
  return apiRequest('/stats/global', { method: 'GET' });
}

export function fetchUsersApi() {
  return apiRequest('/users', { method: 'GET' });
}

export function createUserApi({ name, email, password, isAdmin }) {
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, isAdmin }),
  });
}
