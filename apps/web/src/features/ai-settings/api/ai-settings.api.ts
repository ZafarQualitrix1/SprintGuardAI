import type {
  AgentSummary,
  AiCostSummary,
  AiModelSummary,
  AiProviderSummary,
  AiUsageSummary,
  ListAiLogsParams,
  ListAiLogsResult,
  ModuleAiConfigSummary,
  TestAiProviderConnectionResult,
  UpsertAiProviderConfigInput,
  UpsertModuleAiConfigInput,
} from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

// Raw AiProviderConfig row shape (not the merged-with-stats AiProviderSummary the list endpoint
// returns) -- mutations only need to trigger a providers-list refetch, so callers don't depend on
// exact field alignment here.
interface ProviderConfigMutationResult {
  id: string;
  provider: string;
  isEnabled: boolean;
  isDefault: boolean;
}

// Thin wrappers over apiClient, one per backend endpoint. Components never call apiClient directly.
export const aiSettingsApi = {
  listProviders: () => apiClient.get<AiProviderSummary[]>('/ai/providers'),
  upsertProviderConfig: (provider: string, input: UpsertAiProviderConfigInput) =>
    apiClient.patch<ProviderConfigMutationResult>(`/ai/providers/${provider}`, input),
  enableProvider: (provider: string) =>
    apiClient.post<ProviderConfigMutationResult>(`/ai/providers/${provider}/enable`),
  disableProvider: (provider: string) =>
    apiClient.post<ProviderConfigMutationResult>(`/ai/providers/${provider}/disable`),
  setDefaultProvider: (provider: string) =>
    apiClient.post<ProviderConfigMutationResult>(`/ai/providers/${provider}/set-default`),
  testProviderConnection: (provider: string) =>
    apiClient.post<TestAiProviderConnectionResult>(`/ai/providers/${provider}/test`),

  listModels: () => apiClient.get<AiModelSummary[]>('/ai/models'),

  listModuleConfigs: () => apiClient.get<ModuleAiConfigSummary[]>('/ai/modules'),
  upsertModuleConfig: (capability: string, input: UpsertModuleAiConfigInput) =>
    apiClient.patch<{ id: string; capability: string }>(`/ai/modules/${capability}`, input),

  listAgents: () => apiClient.get<AgentSummary[]>('/agents'),
  enableAgent: (key: string) => apiClient.post<{ id: string; key: string; status: string }>(`/agents/${key}/enable`),
  disableAgent: (key: string) =>
    apiClient.post<{ id: string; key: string; status: string }>(`/agents/${key}/disable`),

  getUsageSummary: () => apiClient.get<AiUsageSummary>('/ai-ops/usage'),
  getCostSummary: () => apiClient.get<AiCostSummary>('/ai-ops/cost'),
  listLogs: (params: ListAiLogsParams) => {
    const query = new URLSearchParams();
    if (params.date) query.set('date', params.date);
    if (params.agentKey) query.set('agentKey', params.agentKey);
    if (params.provider) query.set('provider', params.provider);
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    const qs = query.toString();
    return apiClient.get<ListAiLogsResult>(`/ai-ops/logs${qs ? `?${qs}` : ''}`);
  },
};
