import { apiRequest } from './client';

export function fetchTasksApi(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  const qs = query.toString();
  return apiRequest(`/tasks${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

export function createTaskApi(payload) {
  return apiRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTaskApi(id, payload) {
  return apiRequest(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateTaskStatusApi(id, status) {
  return apiRequest(`/tasks/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getTaskHistoryApi(id) {
  return apiRequest(`/tasks/${id}/history`, {
    method: 'GET',
  });
}
