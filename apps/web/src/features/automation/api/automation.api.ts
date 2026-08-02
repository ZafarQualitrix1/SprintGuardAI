import type { AutomationCandidate, AutomationGeneration, AutomationGenerationDetail } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export const automationApi = {
  listCandidates: (sprintId: string) =>
    apiClient.get<AutomationCandidate[]>(`/sprints/${sprintId}/automation-candidates`),
  listByTestCase: (testCaseId: string) =>
    apiClient.get<AutomationGeneration[]>(`/test-cases/${testCaseId}/automation`),
  generate: (testCaseId: string, automationType: 'API' | 'UI') =>
    apiClient.post<AutomationGeneration>(`/test-cases/${testCaseId}/automation/generate`, { automationType }),
  detail: (automationGenerationId: string) =>
    apiClient.get<AutomationGenerationDetail>(`/automation/${automationGenerationId}`),
  save: (automationGenerationId: string) =>
    apiClient.post<AutomationGeneration>(`/automation/${automationGenerationId}/save`),
};
