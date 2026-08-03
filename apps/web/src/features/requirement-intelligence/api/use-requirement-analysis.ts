'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { requirementAnalysisApi } from './requirement-analysis.api';

const key = (storyId: string) => ['requirement-analysis', storyId];

export function useRequirementAnalysisReport(storyId: string) {
  return useQuery({
    queryKey: key(storyId),
    queryFn: () => requirementAnalysisApi.getLatest(storyId),
  });
}

export function useRequirementAnalysisHistory(storyId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...key(storyId), 'history'],
    queryFn: () => requirementAnalysisApi.getHistory(storyId),
    enabled,
  });
}

export function useGenerateRequirementAnalysis(storyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requirementAnalysisApi.generate(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key(storyId) });
      // Bug 3: Coverage must refresh automatically whenever Requirement Analysis changes -- it
      // recomputes live on every GET (no cache to go stale), so invalidating just triggers a refetch.
      queryClient.invalidateQueries({ queryKey: ['coverage', 'story', storyId] });
    },
  });
}
