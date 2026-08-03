import type { AutomationExecutionRun, TriggerAutomationExecutionInput } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export const automationExecutionApi = {
  run: (storyId: string, input: TriggerAutomationExecutionInput) =>
    apiClient.post<AutomationExecutionRun>(`/stories/${storyId}/automation-execution/run`, input),
  listByStory: (storyId: string) =>
    apiClient.get<AutomationExecutionRun[]>(`/stories/${storyId}/automation-execution/runs`),
  get: (runId: string) => apiClient.get<AutomationExecutionRun>(`/automation-execution/${runId}`),
  cancel: (runId: string) => apiClient.post<AutomationExecutionRun>(`/automation-execution/${runId}/cancel`),
};
