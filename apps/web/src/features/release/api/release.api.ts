import type { ReleaseReport } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export const releaseApi = {
  get: (sprintId: string) => apiClient.get<ReleaseReport | null>(`/sprints/${sprintId}/release-readiness`),
  compute: (sprintId: string) => apiClient.post<ReleaseReport>(`/sprints/${sprintId}/release-readiness/compute`),
};
