import type {
  CreateProjectInput,
  ImportJiraSprintInput,
  Project,
  Sprint,
  SprintDetail,
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
};
