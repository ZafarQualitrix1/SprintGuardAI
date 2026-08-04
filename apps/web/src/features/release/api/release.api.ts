import type { ReleaseReport, ReleaseScoringConfig, SprintReleaseGates } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export type UpdateReleaseScoringConfigInput = Omit<ReleaseScoringConfig, 'projectId' | 'isCustomized'>;
export type UpdateSprintReleaseGatesInput = Partial<SprintReleaseGates>;

export const releaseApi = {
  get: (sprintId: string) => apiClient.get<ReleaseReport | null>(`/sprints/${sprintId}/release-readiness`),
  compute: (sprintId: string) => apiClient.post<ReleaseReport>(`/sprints/${sprintId}/release-readiness/compute`),
  getScoringConfig: (sprintId: string) =>
    apiClient.get<ReleaseScoringConfig>(`/sprints/${sprintId}/release-readiness/scoring-config`),
  updateScoringConfig: (sprintId: string, input: UpdateReleaseScoringConfigInput) =>
    apiClient.put<ReleaseScoringConfig>(`/sprints/${sprintId}/release-readiness/scoring-config`, input),
  getGates: (sprintId: string) => apiClient.get<SprintReleaseGates>(`/sprints/${sprintId}/release-readiness/gates`),
  updateGates: (sprintId: string, input: UpdateSprintReleaseGatesInput) =>
    apiClient.patch<SprintReleaseGates>(`/sprints/${sprintId}/release-readiness/gates`, input),
};
