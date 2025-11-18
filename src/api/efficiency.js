import { apiRequest } from './client';

export function fetchMyEfficiencyApi() {
  return apiRequest('/users/me/efficiency', { method: 'GET' });
}
