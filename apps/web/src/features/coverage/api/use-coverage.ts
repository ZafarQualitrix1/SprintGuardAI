'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coverageApi } from './coverage.api';

export function useCoverage(sprintId: string) {
  return useQuery({
    queryKey: ['coverage', sprintId],
    queryFn: () => coverageApi.get(sprintId),
    enabled: Boolean(sprintId),
  });
}

// Writes the compute response straight into the query cache (setQueryData) instead of
// invalidating -- a plain refetch would call GET .../coverage, which never returns
// aiRecommendation (not persisted server-side, see CoverageResult's comment in @sprintguard/shared),
// so invalidating would immediately overwrite and hide the recommendations this same call produced.
export function useComputeCoverage(sprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => coverageApi.compute(sprintId),
    onSuccess: (result) => queryClient.setQueryData(['coverage', sprintId], result),
  });
}

// GET .../stories/:storyId/coverage always recomputes live (no persistence step -- see
// GetStoryCoverageHandler's comment), so unlike sprint-level coverage above, a plain refetch here
// is always safe and cheap; only aiRecommendation is compute-only, same caveat as above.
export function useStoryCoverage(storyId: string | null) {
  return useQuery({
    queryKey: ['coverage', 'story', storyId],
    queryFn: () => coverageApi.getForStory(storyId as string),
    enabled: Boolean(storyId),
  });
}

export function useComputeStoryCoverage(storyId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => coverageApi.computeForStory(storyId as string),
    onSuccess: (result) => queryClient.setQueryData(['coverage', 'story', storyId], result),
  });
}
