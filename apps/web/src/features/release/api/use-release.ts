'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { releaseApi } from './release.api';

export function useReleaseReport(sprintId: string) {
  return useQuery({
    queryKey: ['release', sprintId],
    queryFn: () => releaseApi.get(sprintId),
  });
}

export function useComputeReleaseReadiness(sprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => releaseApi.compute(sprintId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['release', sprintId] }),
  });
}
