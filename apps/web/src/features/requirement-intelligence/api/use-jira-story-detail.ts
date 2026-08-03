'use client';

import { useQuery } from '@tanstack/react-query';
import { jiraStoryDetailApi } from './jira-story-detail.api';

// Only fetched when the drawer is actually opened (`enabled`) -- every Jira field for a story is
// a relatively heavy live fetch, not something to run for every story card up front.
export function useJiraStoryDetail(storyId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['requirement-intelligence', 'jira-detail', storyId],
    queryFn: () => jiraStoryDetailApi.get(storyId as string),
    enabled: Boolean(storyId) && enabled,
  });
}
