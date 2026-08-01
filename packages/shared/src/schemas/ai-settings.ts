import { z } from 'zod';

// Form schema for the provider config dialog (API key optional -- "leave blank to keep current"
// on edit, same convention as updateConnectionSchema for Jira credentials).
export const upsertAiProviderConfigSchema = z.object({
  apiKey: z.union([z.string().min(8, 'API key looks too short'), z.literal('')]).optional(),
  defaultModel: z.string().optional(),
  projectId: z.string().optional(),
  region: z.string().optional(),
  timeoutMs: z.coerce.number().min(1000).max(120000).optional(),
  retryCount: z.coerce.number().min(0).max(5).optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
  topP: z.coerce.number().min(0).max(1).optional(),
  topK: z.coerce.number().min(1).optional(),
  maxOutputTokens: z.coerce.number().min(1).optional(),
  streaming: z.boolean().optional(),
  fallbackProvider: z.string().optional(),
  fallbackModel: z.string().optional(),
});
export type UpsertAiProviderConfigInput = z.infer<typeof upsertAiProviderConfigSchema>;

export const upsertModuleAiConfigSchema = z.object({
  isEnabled: z.boolean().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
  maxTokens: z.coerce.number().min(1).optional(),
  retryCount: z.coerce.number().min(0).max(5).optional(),
  timeoutMs: z.coerce.number().min(1000).max(120000).optional(),
  streaming: z.boolean().optional(),
  fallbackProvider: z.string().optional(),
  fallbackModel: z.string().optional(),
});
export type UpsertModuleAiConfigInput = z.infer<typeof upsertModuleAiConfigSchema>;

export interface AiProviderSummary {
  provider: string;
  displayName: string;
  supported: boolean;
  isEnabled: boolean;
  isDefault: boolean;
  hasApiKey: boolean;
  defaultModel: string | null;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  lastConnectedAt: string | null;
  lastTestLatencyMs: number | null;
  lastTestError: string | null;
  totalRequests: number;
  successRate: number;
  avgResponseTimeMs: number | null;
}

export interface AiModelSummary {
  id: string;
  provider: string;
  model: string;
  version: string | null;
  allowedCapabilities: string[];
  costTier: string;
  isActive: boolean;
  speedLabel: string;
  bestUseCase: string;
}

export interface ModuleAiConfigSummary {
  capability: string;
  displayName: string;
  integrated: boolean;
  isEnabled: boolean;
  provider: string | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  retryCount: number | null;
  timeoutMs: number | null;
  streaming: boolean | null;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  activePromptVersion: string | null;
}

export interface AgentSummary {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: string;
  isBuiltIn: boolean;
  avgLatencyMs: number | null;
  avgConfidenceScore: number | null;
  successRate: number;
  totalExecutions: number;
  lastExecutionAt: string | null;
}

export interface AiUsageWindow {
  requests: number;
  tokens: number;
}

export interface AiUsageSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTimeMs: number | null;
  avgTokensPerRequest: number | null;
  last24h: AiUsageWindow;
  last7d: AiUsageWindow;
  last30d: AiUsageWindow;
  dailyTrend: Array<{ date: string; requests: number; tokens: number }>;
}

export interface AiCostSummary {
  totalCostUsd: number;
  last24hCostUsd: number;
  last30dCostUsd: number;
  costByProvider: Array<{ provider: string; costUsd: number }>;
  costByModule: Array<{ agentKey: string; agentName: string; costUsd: number }>;
  budget: { limitUsd: number; usedUsd: number; remainingUsd: number } | null;
}

export interface AiLogEntry {
  agentRunId: string;
  timestamp: string;
  module: string;
  provider: string | null;
  model: string | null;
  promptVersion: string | null;
  executionTimeMs: number | null;
  tokensUsed: number | null;
  status: string;
  error: string | null;
  responseId: string | null;
}

export interface ListAiLogsResult {
  items: AiLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListAiLogsParams {
  date?: string;
  agentKey?: string;
  provider?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface TestAiProviderConnectionResult {
  healthStatus: 'HEALTHY' | 'UNHEALTHY';
  latencyMs: number;
  model: string;
  error?: string;
}
