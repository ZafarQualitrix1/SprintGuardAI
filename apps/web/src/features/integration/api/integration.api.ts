import type { ConnectJiraInput, IntegrationConnection } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export const integrationApi = {
  list: () => apiClient.get<IntegrationConnection[]>('/integrations'),
  connectJira: (input: ConnectJiraInput) =>
    apiClient.post<IntegrationConnection>('/integrations/jira/connect', input),
};
