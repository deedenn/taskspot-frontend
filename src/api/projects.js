import { apiRequest } from './client';

export function fetchProjectsApi() {
  return apiRequest('/projects', { method: 'GET' });
}

export function createProjectApi({ name, description }) {
  return apiRequest('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
}

export function updateProjectApi(id, payload) {
  return apiRequest(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function fetchProjectMembersApi(projectId) {
  return apiRequest(`/projects/${projectId}/members`, {
    method: 'GET',
  });
}

export function addMemberApi(projectId, email) {
  return apiRequest(`/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function removeMemberApi(projectId, userId) {
  return apiRequest(`/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
  });
}

export function revokeInviteApi(projectId, token) {
  return apiRequest(`/projects/${projectId}/invitations/${token}`, {
    method: 'DELETE',
  });
}

export function getInviteInfoApi(token) {
  return apiRequest(`/projects/invite/${token}`, { method: 'GET' });
}
