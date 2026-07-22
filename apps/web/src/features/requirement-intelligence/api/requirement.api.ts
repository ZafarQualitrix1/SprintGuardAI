import type { Requirement } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export const requirementApi = {
  listByStory: (storyId: string) => apiClient.get<Requirement[]>(`/stories/${storyId}/requirements`),
  generate: (storyId: string) => apiClient.post<Requirement[]>(`/stories/${storyId}/requirements/generate`),
};
