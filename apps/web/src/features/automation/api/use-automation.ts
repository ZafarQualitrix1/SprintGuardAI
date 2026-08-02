'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { automationApi } from './automation.api';

export function useAutomationCandidates(sprintId: string) {
  return useQuery({
    queryKey: ['automation', 'candidates', sprintId],
    queryFn: () => automationApi.listCandidates(sprintId),
  });
}

export function useAutomationByTestCase(testCaseId: string, enabled = true) {
  return useQuery({
    queryKey: ['automation', 'by-test-case', testCaseId],
    queryFn: () => automationApi.listByTestCase(testCaseId),
    enabled,
  });
}

export function useAutomationDetail(automationGenerationId: string | null) {
  return useQuery({
    queryKey: ['automation', 'detail', automationGenerationId],
    queryFn: () => automationApi.detail(automationGenerationId as string),
    enabled: Boolean(automationGenerationId),
  });
}

export function useGenerateAutomation(sprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ testCaseId, automationType }: { testCaseId: string; automationType: 'API' | 'UI' }) =>
      automationApi.generate(testCaseId, automationType),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['automation', 'candidates', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['automation', 'by-test-case', variables.testCaseId] });
    },
  });
}

export function useSaveAutomation(sprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (automationGenerationId: string) => automationApi.save(automationGenerationId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['automation', 'candidates', sprintId] });
      queryClient.invalidateQueries({ queryKey: ['automation', 'detail', result.id] });
    },
  });
}
