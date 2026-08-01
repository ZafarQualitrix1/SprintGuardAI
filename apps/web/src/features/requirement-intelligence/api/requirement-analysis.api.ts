import type { RequirementAnalysisReport } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export const requirementAnalysisApi = {
  getLatest: (storyId: string) =>
    apiClient.get<RequirementAnalysisReport | null>(`/stories/${storyId}/analysis`),
  getHistory: (storyId: string) =>
    apiClient.get<RequirementAnalysisReport[]>(`/stories/${storyId}/analysis/history`),
  generate: (storyId: string) =>
    apiClient.post<RequirementAnalysisReport>(`/stories/${storyId}/analysis/generate`),
};
