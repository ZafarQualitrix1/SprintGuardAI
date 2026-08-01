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
    },
  });
}
