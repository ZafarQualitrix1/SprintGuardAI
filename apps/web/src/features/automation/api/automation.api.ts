import type {
  ApprovedApiAutomationCandidate,
  AutomationCandidate,
  AutomationGeneration,
  AutomationGenerationDetail,
} from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export interface ApprovedApiAutomationCandidateFilters {
  projectId?: string;
  sprintId?: string;
  storyIds?: string[];
}

export const automationApi = {
  listCandidates: (sprintId: string) =>
    apiClient.get<AutomationCandidate[]>(`/sprints/${sprintId}/automation-candidates`),
  // API Automation module: org-wide, BA-approved+locked, API-type only -- distinct endpoint from
  // listCandidates above (the old per-sprint tab's feed).
  listApprovedApiCandidates: (filters: ApprovedApiAutomationCandidateFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.projectId) params.set('projectId', filters.projectId);
    if (filters.sprintId) params.set('sprintId', filters.sprintId);
    if (filters.storyIds?.length) params.set('storyIds', filters.storyIds.join(','));
    const query = params.toString();
    return apiClient.get<ApprovedApiAutomationCandidate[]>(`/automation/candidates${query ? `?${query}` : ''}`);
  },
  listByTestCase: (testCaseId: string) =>
    apiClient.get<AutomationGeneration[]>(`/test-cases/${testCaseId}/automation`),
  generate: (testCaseId: string, automationType: 'API' | 'UI') =>
    apiClient.post<AutomationGeneration>(`/test-cases/${testCaseId}/automation/generate`, { automationType }),
  detail: (automationGenerationId: string) =>
    apiClient.get<AutomationGenerationDetail>(`/automation/${automationGenerationId}`),
  save: (automationGenerationId: string) =>
    apiClient.post<AutomationGeneration>(`/automation/${automationGenerationId}/save`),
};
