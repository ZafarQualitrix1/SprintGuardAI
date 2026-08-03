import type { Execution, RecordExecutionInput } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export const executionApi = {
  listBySprint: (sprintId: string) => apiClient.get<Execution[]>(`/sprints/${sprintId}/executions`),
  listByStory: (storyId: string) => apiClient.get<Execution[]>(`/stories/${storyId}/executions`),
  record: (testCaseId: string, input: RecordExecutionInput) =>
    apiClient.post<Execution>(`/test-cases/${testCaseId}/executions`, input),
};
