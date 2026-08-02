import type {
  CreatePromptInput,
  CreatePromptVersionInput,
  Prompt,
  PromptAnalyticsSummary,
  PromptComparisonResult,
  PromptExecutionRow,
  PromptLibraryRow,
  PromptPlaygroundResult,
  UpdatePromptDraftInput,
} from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export interface PromptListParams {
  search?: string;
  category?: string;
  status?: string;
  createdBy?: string;
  page?: number;
  pageSize?: number;
}

export interface ExecutionListParams {
  capability?: string;
  provider?: string;
  model?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

function toQueryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const promptApi = {
  list: (params: PromptListParams = {}) =>
    apiClient.get<{ rows: PromptLibraryRow[]; total: number }>(`/prompts${toQueryString(params)}`),
  history: (capability: string) => apiClient.get<Prompt[]>(`/prompts/${capability}`),
  getVersion: (capability: string, version: string) => apiClient.get<Prompt | null>(`/prompts/${capability}/${version}`),
  variables: (capability: string, version?: string) =>
    apiClient.get<string[]>(`/prompts/${capability}/variables${version ? `?version=${version}` : ''}`),
  compare: (capability: string, a: string, b: string) =>
    apiClient.get<PromptComparisonResult>(`/prompts/${capability}/compare?a=${a}&b=${b}`),

  create: (input: CreatePromptInput) => apiClient.post<Prompt>('/prompts', input),
  createVersion: (capability: string, input: CreatePromptVersionInput) =>
    apiClient.post<Prompt>(`/prompts/${capability}`, input),
  updateDraft: (capability: string, version: string, patch: UpdatePromptDraftInput) =>
    apiClient.patch<Prompt>(`/prompts/${capability}/${version}`, patch),
  clone: (capability: string, version: string, asNewCapability?: { asNewCapability: string; asNewCapabilityAgentKey: string }) =>
    apiClient.post<Prompt>(`/prompts/${capability}/${version}/clone`, asNewCapability ?? {}),
  submitForReview: (capability: string, version: string) =>
    apiClient.post<Prompt>(`/prompts/${capability}/${version}/submit-review`),
  approve: (capability: string, version: string, rationale?: string) =>
    apiClient.post<Prompt>(`/prompts/${capability}/${version}/approve`, { rationale }),
  reject: (capability: string, version: string, rationale: string) =>
    apiClient.post<Prompt>(`/prompts/${capability}/${version}/reject`, { rationale }),
  activate: (capability: string, version: string) => apiClient.post<Prompt>(`/prompts/${capability}/${version}/activate`),
  archive: (capability: string, version: string) => apiClient.post<Prompt>(`/prompts/${capability}/${version}/archive`),
  delete: (capability: string, version: string) => apiClient.delete<void>(`/prompts/${capability}/${version}`),

  runPlayground: (promptId: string, variables: Record<string, unknown>, provider?: string) =>
    apiClient.post<PromptPlaygroundResult>('/prompts/playground/execute', { promptId, variables, provider }),

  listExecutions: (params: ExecutionListParams = {}) =>
    apiClient.get<{ rows: PromptExecutionRow[]; total: number }>(`/prompts/executions${toQueryString(params)}`),
  analytics: (days = 30) => apiClient.get<PromptAnalyticsSummary>(`/prompts/analytics?days=${days}`),
};
