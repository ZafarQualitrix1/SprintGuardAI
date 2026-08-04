'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { testIntelligenceApi } from './test-intelligence.api';

export function useTestScenarios(storyId: string) {
  return useQuery({
    queryKey: ['test-intelligence', storyId],
    queryFn: () => testIntelligenceApi.listByStory(storyId),
  });
}

export function useGenerateTestScenarios(storyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => testIntelligenceApi.generateScenarios(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-intelligence', storyId] });
    },
  });
}

export function useGenerateTestCases(storyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => testIntelligenceApi.generateCases(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-intelligence', storyId] });
      // Bug 3: Coverage must refresh automatically whenever Test Generation changes.
      queryClient.invalidateQueries({ queryKey: ['coverage', 'story', storyId] });
    },
  });
}
