import { apiRequest } from './client';

export function fetchMyEfficiencyApi() {
  return apiRequest('/users/me/efficiency', {
    method: 'GET',
  });
}

export function fetchUserEfficiencyApi(userId) {
  return apiRequest(`/users/${userId}/efficiency`, {
    method: 'GET',
  });
}
