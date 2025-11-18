import { apiRequest } from './client';

export function landingVisitApi() {
  return apiRequest('/metrics/landing/visit', { method: 'POST' });
}

export function landingRegisterClickApi() {
  return apiRequest('/metrics/landing/register-click', { method: 'POST' });
}
