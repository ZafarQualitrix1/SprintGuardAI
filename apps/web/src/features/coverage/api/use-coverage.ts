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
