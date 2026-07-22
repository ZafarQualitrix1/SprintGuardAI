import type { TestScenario } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export const testIntelligenceApi = {
  listByStory: (storyId: string) => apiClient.get<TestScenario[]>(`/stories/${storyId}/tests`),
  generate: (storyId: string) => apiClient.post<TestScenario[]>(`/stories/${storyId}/tests/generate`),
};
