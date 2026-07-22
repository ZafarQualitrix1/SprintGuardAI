'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { requirementApi } from './requirement.api';

export function useRequirements(storyId: string) {
  return useQuery({
    queryKey: ['requirement-intelligence', storyId],
    queryFn: () => requirementApi.listByStory(storyId),
  });
}

export function useGenerateRequirements(storyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requirementApi.generate(storyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requirement-intelligence', storyId] }),
  });
}
