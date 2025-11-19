import { apiRequest } from './client';

export function trackLandingVisit() {
  return apiRequest('/metrics/landing/visit', {
    method: 'POST',
  }).catch(() => {});
}

export function trackLandingRegisterClick() {
  return apiRequest('/metrics/landing/register-click', {
    method: 'POST',
  }).catch(() => {});
}

export function fetchLandingMetrics() {
  return apiRequest('/metrics/landing', {
    method: 'GET',
  });
}
