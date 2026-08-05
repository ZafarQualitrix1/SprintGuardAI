'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { automationApi, ApprovedApiAutomationCandidateFilters } from './automation.api';

// API Automation module -- filters are the Project -> Sprint -> Story cascade; an empty object
// filters nothing (org-wide), which the page never actually does since a project must be selected
// first, but the query itself doesn't require it.
export function useApprovedApiAutomationCandidates(filters: ApprovedApiAutomationCandidateFilters) {
  return useQuery({
    queryKey: ['automation', 'approved-api-candidates', filters],
    queryFn: () => automationApi.listApprovedApiCandidates(filters),
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

// API Automation module: not tied to one sprintId (candidates span the whole org), so this
// invalidates by query-key prefix -- react-query matches every ['automation', 'approved-api-
// candidates', <any filters>] entry regardless of the exact filter values cached under it.
export function useGenerateApiAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ testCaseId, automationType }: { testCaseId: string; automationType: 'API' | 'UI' }) =>
      automationApi.generate(testCaseId, automationType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', 'approved-api-candidates'] });
    },
  });
}

export function useSaveApiAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (automationGenerationId: string) => automationApi.save(automationGenerationId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['automation', 'approved-api-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['automation', 'detail', result.id] });
    },
  });
}
