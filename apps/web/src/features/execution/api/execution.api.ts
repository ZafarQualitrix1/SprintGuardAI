import type { Execution, RecordExecutionInput } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export const executionApi = {
  listBySprint: (sprintId: string) => apiClient.get<Execution[]>(`/sprints/${sprintId}/executions`),
  record: (testCaseId: string, input: RecordExecutionInput) =>
    apiClient.post<Execution>(`/test-cases/${testCaseId}/executions`, input),
};
