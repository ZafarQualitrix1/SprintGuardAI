import type { JiraStoryDetail } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export const jiraStoryDetailApi = {
  get: (storyId: string) => apiClient.get<JiraStoryDetail>(`/stories/${storyId}/jira-detail`),
};
