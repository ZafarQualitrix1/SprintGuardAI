'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePromptInput,
  CreatePromptVersionInput,
  UpdatePromptDraftInput,
} from '@sprintguard/shared';
import { ExecutionListParams, promptApi, PromptListParams } from './prompt.api';

const LIST_KEY = ['prompts', 'list'];
const historyKey = (capability: string) => ['prompts', 'history', capability];
const versionKey = (capability: string, version: string) => ['prompts', 'version', capability, version];
const EXECUTIONS_KEY = ['prompts', 'executions'];
const ANALYTICS_KEY = ['prompts', 'analytics'];

export function usePromptList(params: PromptListParams) {
  return useQuery({ queryKey: [...LIST_KEY, params], queryFn: () => promptApi.list(params) });
}

export function usePromptHistory(capability: string | undefined) {
  return useQuery({
    queryKey: historyKey(capability ?? ''),
    queryFn: () => promptApi.history(capability!),
    enabled: Boolean(capability),
  });
}

export function usePromptVersion(capability: string | undefined, version: string | undefined) {
  return useQuery({
    queryKey: versionKey(capability ?? '', version ?? ''),
    queryFn: () => promptApi.getVersion(capability!, version!),
    enabled: Boolean(capability && version),
  });
}

export function usePromptVariables(capability: string | undefined, version?: string) {
  return useQuery({
    queryKey: ['prompts', 'variables', capability, version],
    queryFn: () => promptApi.variables(capability!, version),
    enabled: Boolean(capability),
  });
}

export function usePromptCompare(capability: string | undefined, a: string | undefined, b: string | undefined) {
  return useQuery({
    queryKey: ['prompts', 'compare', capability, a, b],
    queryFn: () => promptApi.compare(capability!, a!, b!),
    enabled: Boolean(capability && a && b),
  });
}

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
    queryClient.invalidateQueries({ queryKey: ['prompts', 'history'] });
    queryClient.invalidateQueries({ queryKey: ['prompts', 'version'] });
  };
}

export function useCreatePrompt() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: CreatePromptInput) => promptApi.create(input),
    onSuccess: invalidate,
  });
}

export function useCreatePromptVersion(capability: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: CreatePromptVersionInput) => promptApi.createVersion(capability, input),
    onSuccess: invalidate,
  });
}

export function useUpdatePromptDraft(capability: string, version: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (patch: UpdatePromptDraftInput) => promptApi.updateDraft(capability, version, patch),
    onSuccess: invalidate,
  });
}

export function useClonePrompt(capability: string, version: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (asNewCapability?: { asNewCapability: string; asNewCapabilityAgentKey: string }) =>
      promptApi.clone(capability, version, asNewCapability),
    onSuccess: invalidate,
  });
}

export function useSubmitPromptForReview(capability: string, version: string) {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: () => promptApi.submitForReview(capability, version), onSuccess: invalidate });
}

export function useApprovePrompt(capability: string, version: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (rationale?: string) => promptApi.approve(capability, version, rationale),
    onSuccess: invalidate,
  });
}

export function useRejectPrompt(capability: string, version: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (rationale: string) => promptApi.reject(capability, version, rationale),
    onSuccess: invalidate,
  });
}

export function useActivatePrompt(capability: string, version: string) {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: () => promptApi.activate(capability, version), onSuccess: invalidate });
}

export function useArchivePrompt(capability: string, version: string) {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: () => promptApi.archive(capability, version), onSuccess: invalidate });
}

export function useDeletePrompt(capability: string, version: string) {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: () => promptApi.delete(capability, version), onSuccess: invalidate });
}

export function useRunPromptPlayground() {
  return useMutation({
    mutationFn: ({ promptId, variables, provider }: { promptId: string; variables: Record<string, unknown>; provider?: string }) =>
      promptApi.runPlayground(promptId, variables, provider),
  });
}

export function usePromptExecutions(params: ExecutionListParams) {
  return useQuery({ queryKey: [...EXECUTIONS_KEY, params], queryFn: () => promptApi.listExecutions(params) });
}

export function usePromptAnalytics(days = 30) {
  return useQuery({ queryKey: [...ANALYTICS_KEY, days], queryFn: () => promptApi.analytics(days) });
}
