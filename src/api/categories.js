import { apiRequest } from './client';

export function fetchCategoriesApi(projectId) {
  const qs = projectId ? `?projectId=${projectId}` : '';
  return apiRequest(`/categories${qs}`, { method: 'GET' });
}

export function createCategoryApi({ projectId, name, color }) {
  return apiRequest('/categories', {
    method: 'POST',
    body: JSON.stringify({ projectId, name, color }),
  });
}
