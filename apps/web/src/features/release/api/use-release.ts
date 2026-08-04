'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { releaseApi, UpdateReleaseScoringConfigInput, UpdateSprintReleaseGatesInput } from './release.api';

export function useReleaseReport(sprintId: string) {
  return useQuery({
    queryKey: ['release', sprintId],
    queryFn: () => releaseApi.get(sprintId),
    enabled: Boolean(sprintId),
  });
}

export function useComputeReleaseReadiness(sprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => releaseApi.compute(sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['release-history', sprintId] });
    },
  });
}

export function useReleaseReportHistory(sprintId: string, limit = 20) {
  return useQuery({
    queryKey: ['release-history', sprintId, limit],
    queryFn: () => releaseApi.getHistory(sprintId, limit),
    enabled: Boolean(sprintId),
  });
}

export function useReleaseScoringConfig(sprintId: string) {
  return useQuery({
    queryKey: ['release-scoring-config', sprintId],
    queryFn: () => releaseApi.getScoringConfig(sprintId),
    enabled: Boolean(sprintId),
  });
}

export function useUpdateReleaseScoringConfig(sprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateReleaseScoringConfigInput) => releaseApi.updateScoringConfig(sprintId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['release-scoring-config', sprintId] }),
  });
}

export function useSprintReleaseGates(sprintId: string) {
  return useQuery({
    queryKey: ['release-gates', sprintId],
    queryFn: () => releaseApi.getGates(sprintId),
    enabled: Boolean(sprintId),
  });
}

export function useUpdateSprintReleaseGates(sprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSprintReleaseGatesInput) => releaseApi.updateGates(sprintId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-gates', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['release', sprintId] });
    },
  });
}
