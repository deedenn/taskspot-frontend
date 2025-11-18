import { apiRequest } from './client';

export function fetchGlobalStatsApi() {
  return apiRequest('/stats/global', { method: 'GET' });
}

export function fetchLandingMetricsApi() {
  return apiRequest('/metrics/landing', { method: 'GET' });
}

export function fetchUsersAdminApi() {
  return apiRequest('/users', { method: 'GET' });
}

export function createUserAdminApi(payload) {
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
