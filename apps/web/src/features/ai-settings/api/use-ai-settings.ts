'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListAiLogsParams, UpsertAiProviderConfigInput, UpsertModuleAiConfigInput } from '@sprintguard/shared';
import { aiSettingsApi } from './ai-settings.api';

const PROVIDERS_KEY = ['ai-settings', 'providers'];
const MODELS_KEY = ['ai-settings', 'models'];
const MODULES_KEY = ['ai-settings', 'modules'];
const AGENTS_KEY = ['ai-settings', 'agents'];
const USAGE_KEY = ['ai-settings', 'usage'];
const COST_KEY = ['ai-settings', 'cost'];

export function useAiProviders() {
  return useQuery({ queryKey: PROVIDERS_KEY, queryFn: aiSettingsApi.listProviders });
}

export function useUpsertProviderConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, input }: { provider: string; input: UpsertAiProviderConfigInput }) =>
      aiSettingsApi.upsertProviderConfig(provider, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY }),
  });
}

export function useEnableProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aiSettingsApi.enableProvider,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY }),
  });
}

export function useDisableProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aiSettingsApi.disableProvider,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY }),
  });
}

export function useSetDefaultProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aiSettingsApi.setDefaultProvider,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY }),
  });
}

export function useTestProviderConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aiSettingsApi.testProviderConnection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROVIDERS_KEY }),
  });
}

export function useAiModels() {
  return useQuery({ queryKey: MODELS_KEY, queryFn: aiSettingsApi.listModels });
}

export function useModuleAiConfigs() {
  return useQuery({ queryKey: MODULES_KEY, queryFn: aiSettingsApi.listModuleConfigs });
}

export function useUpsertModuleAiConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ capability, input }: { capability: string; input: UpsertModuleAiConfigInput }) =>
      aiSettingsApi.upsertModuleConfig(capability, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MODULES_KEY }),
  });
}

export function useAiAgents() {
  return useQuery({ queryKey: AGENTS_KEY, queryFn: aiSettingsApi.listAgents });
}

export function useEnableAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aiSettingsApi.enableAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENTS_KEY }),
  });
}

export function useDisableAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aiSettingsApi.disableAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENTS_KEY }),
  });
}

export function useAiUsageSummary() {
  return useQuery({ queryKey: USAGE_KEY, queryFn: aiSettingsApi.getUsageSummary });
}

export function useAiCostSummary() {
  return useQuery({ queryKey: COST_KEY, queryFn: aiSettingsApi.getCostSummary });
}

export function useAiLogs(params: ListAiLogsParams) {
  return useQuery({
    queryKey: ['ai-settings', 'logs', params],
    queryFn: () => aiSettingsApi.listLogs(params),
  });
}
