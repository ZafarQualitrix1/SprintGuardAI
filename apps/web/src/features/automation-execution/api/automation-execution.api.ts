import type { AutomationExecutionRun, TriggerAutomationExecutionInput } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export type ExecutionReportFormat = 'excel' | 'extent' | 'junit';

export const automationExecutionApi = {
  run: (storyId: string, input: TriggerAutomationExecutionInput) =>
    apiClient.post<AutomationExecutionRun>(`/stories/${storyId}/automation-execution/run`, input),
  listByStory: (storyId: string) =>
    apiClient.get<AutomationExecutionRun[]>(`/stories/${storyId}/automation-execution/runs`),
  get: (runId: string) => apiClient.get<AutomationExecutionRun>(`/automation-execution/${runId}`),
  cancel: (runId: string) => apiClient.post<AutomationExecutionRun>(`/automation-execution/${runId}/cancel`),
  // HTML and JSON need no request -- HTML is the GitHub Actions artifact link already on the run
  // (reportArtifactUrl), JSON is just the run object itself, downloaded client-side.
  downloadReport: (runId: string, format: ExecutionReportFormat) =>
    apiClient.getBlob(`/automation-execution/${runId}/report?format=${format}`),
};
