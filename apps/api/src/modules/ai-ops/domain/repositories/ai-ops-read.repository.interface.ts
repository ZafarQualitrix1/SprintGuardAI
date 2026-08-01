export const AI_OPS_READ_REPOSITORY = Symbol('IAiOpsReadRepository');

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

export interface ListAiLogsFilters {
  date?: string; // ISO date (yyyy-mm-dd) -- restricts to that calendar day
  agentKey?: string;
  provider?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface ListAiLogsResult {
  items: AiLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IAiOpsReadRepository {
  getUsageSummary(organizationId: string): Promise<AiUsageSummary>;
  getCostSummary(organizationId: string): Promise<AiCostSummary>;
  listLogs(organizationId: string, filters: ListAiLogsFilters): Promise<ListAiLogsResult>;
}
