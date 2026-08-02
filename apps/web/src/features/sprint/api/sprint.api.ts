import type {
  CreateProjectInput,
  ImportJiraSprintInput,
  Project,
  Sprint,
  SprintDetail,
  SprintSyncEvent,
} from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export const projectsApi = {
  list: () => apiClient.get<Project[]>('/projects'),
  create: (input: CreateProjectInput) => apiClient.post<Project>('/projects', input),
};

export const sprintsApi = {
  listByProject: (projectId: string) =>
    apiClient.get<Sprint[]>(`/sprints?projectId=${encodeURIComponent(projectId)}`),
  get: (id: string) => apiClient.get<SprintDetail>(`/sprints/${id}`),
  importFromJira: (input: ImportJiraSprintInput) =>
    apiClient.post<SprintDetail>('/sprints/import/jira', input),
  sync: (id: string) => apiClient.post<SprintDetail>(`/sprints/${id}/sync`),
  override: (id: string) => apiClient.post<SprintDetail>(`/sprints/${id}/override`),
  rename: (id: string, name: string) => apiClient.patch<Sprint>(`/sprints/${id}`, { name }),
  setArchived: (id: string, archived: boolean) =>
    apiClient.post<Sprint>(`/sprints/${id}/archive`, { archived }),
  remove: (id: string) => apiClient.delete<void>(`/sprints/${id}`),
  syncHistory: (id: string) => apiClient.get<SprintSyncEvent[]>(`/sprints/${id}/sync-history`),
};
