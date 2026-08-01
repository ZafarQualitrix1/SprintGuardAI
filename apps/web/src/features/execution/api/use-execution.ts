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

export function useRecordExecution(sprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ testCaseId, input }: { testCaseId: string; input: RecordExecutionInput }) =>
      executionApi.record(testCaseId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['execution', sprintId] }),
  });
}
