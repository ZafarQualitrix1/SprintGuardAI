'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RecordExecutionInput } from '@sprintguard/shared';
import { executionApi } from './execution.api';

export function useExecutions(sprintId: string) {
  return useQuery({
    queryKey: ['execution', sprintId],
    queryFn: () => executionApi.listBySprint(sprintId),
    enabled: Boolean(sprintId),
  });
}

// Per-story progress check (Bug 1's sprint dashboard "has this story been executed yet?").
export function useExecutionsByStory(storyId: string | null) {
  return useQuery({
    queryKey: ['execution', 'story', storyId],
    queryFn: () => executionApi.listByStory(storyId as string),
    enabled: Boolean(storyId),
  });
}

export function useRecordExecution(sprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ testCaseId, input }: { testCaseId: string; input: RecordExecutionInput }) =>
      executionApi.record(testCaseId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['execution', sprintId] }),
  });
}
