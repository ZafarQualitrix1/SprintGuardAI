import type {
  ConnectJiraInput,
  ExternalBoard,
  ExternalIssueSummary,
  ExternalProject,
  ExternalSprintOption,
  IntegrationConnection,
  SyncConnectionResult,
  TestConnectionResult,
  UpdateConnectionInput,
  VerifyCredentialsResult,
} from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

// Thin wrappers over apiClient, one per backend endpoint. Components never call apiClient directly.
export const integrationApi = {
  list: () => apiClient.get<IntegrationConnection[]>('/integrations'),
  connectJira: (input: ConnectJiraInput) =>
    apiClient.post<IntegrationConnection>('/integrations/jira/connect', input),
  verifyJira: (input: { siteUrl: string; email: string; apiToken: string }) =>
    apiClient.post<VerifyCredentialsResult>('/integrations/jira/verify', input),
  update: (id: string, input: UpdateConnectionInput) =>
    apiClient.patch<IntegrationConnection>(`/integrations/${id}`, input),
  disconnect: (id: string) => apiClient.post<IntegrationConnection>(`/integrations/${id}/disconnect`),
  deletePermanently: (id: string) => apiClient.delete<void>(`/integrations/${id}`),
  setDefault: (id: string) => apiClient.post<IntegrationConnection>(`/integrations/${id}/set-default`),
  test: (id: string) => apiClient.post<TestConnectionResult>(`/integrations/${id}/test`),
  sync: (id: string) => apiClient.post<SyncConnectionResult>(`/integrations/${id}/sync`),
  fetchProjects: (id: string) => apiClient.get<ExternalProject[]>(`/integrations/${id}/projects`),
  fetchBoards: (id: string, projectKey: string) =>
    apiClient.get<ExternalBoard[]>(`/integrations/${id}/boards?projectKey=${encodeURIComponent(projectKey)}`),
  fetchSprints: (id: string, boardId: string) =>
    apiClient.get<ExternalSprintOption[]>(`/integrations/${id}/sprints?boardId=${encodeURIComponent(boardId)}`),
  fetchSprintIssues: (id: string, reference: string) =>
    apiClient.get<ExternalIssueSummary[]>(`/integrations/${id}/sprint-issues?reference=${encodeURIComponent(reference)}`),
};
