import { apiRequest } from './client';

export function fetchTasksApi({ projectId, role, overdue }) {
  const params = new URLSearchParams();
  if (projectId) params.append('projectId', projectId);
  if (role) params.append('role', role);
  if (overdue) params.append('overdue', String(overdue));
  const qs = params.toString();
  return apiRequest(`/tasks${qs ? `?${qs}` : ''}`, { method: 'GET' });
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

export function getTaskApi(id) {
  return apiRequest(`/tasks/${id}`, { method: 'GET' });
}

export function getTaskHistoryApi(id) {
  return apiRequest(`/tasks/${id}/history`, { method: 'GET' });
}
