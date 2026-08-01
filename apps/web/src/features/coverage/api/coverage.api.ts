import type { CoverageResult } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export const coverageApi = {
  get: (sprintId: string) => apiClient.get<CoverageResult | null>(`/sprints/${sprintId}/coverage`),
  compute: (sprintId: string) => apiClient.post<CoverageResult>(`/sprints/${sprintId}/coverage/compute`),
};
