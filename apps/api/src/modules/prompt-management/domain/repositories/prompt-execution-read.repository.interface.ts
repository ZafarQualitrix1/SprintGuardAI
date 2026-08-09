export const PROMPT_EXECUTION_READ_REPOSITORY = Symbol('IPromptExecutionReadRepository');

export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'RETRYING' | 'FLAGGED_FOR_REVIEW';

export interface ExecutionRow {
  id: string; // AgentRun id
  timestamp: Date;
  capability: string;
  agentKey: string | null;
  promptVersion: string | null;
  provider: string;
  model: string;
  status: ExecutionStatus;
  latencyMs: number | null;
  // Sourced from AgentRun.tokensUsed, which only ever stores the combined count -- AiResponse
  // separately has an inputTokens/outputTokens split (Phase 5 of Prompt Management Optimization),
  // but this row intentionally keeps surfacing the same single combined number for every run
  // (including ones that predate the split) rather than a sometimes-present breakdown.
  totalTokens: number | null;
  costUsd: number | null;
  confidenceScore: number | null;
  failureReason: string | null;
  correlationId: string;
  isPlayground: boolean;
}

export interface ExecutionListFilter {
  organizationId: string;
  capability?: string;
  provider?: string;
  model?: string;
  status?: ExecutionStatus;
  search?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export interface AnalyticsSummary {
  totalExecutions: number;
  successRate: number;
  failureRate: number;
  avgLatencyMs: number;
  // Nearest-rank percentiles over the same latency sample avgLatencyMs is computed from -- a mean
  // hides exactly the slow-tail behavior (e.g. the deep-requirement-analysis timeout investigation)
  // that P50/P95 are meant to surface.
  p50LatencyMs: number;
  p95LatencyMs: number;
  avgTokens: number;
  avgCostUsd: number;
  avgConfidenceScore: number;
  // Failure/retry breakdown (Phase 5's AgentRun.retryCount/validationStatus). providerErrorCount
  // covers every non-validation failure kind Phase 3 classifies (timeout, network, 5xx, 429, auth,
  // config) as one bucket -- validationStatus intentionally doesn't split those further (see
  // agent-run.repository.interface.ts), so neither does this.
  retriedExecutionsCount: number;
  validationFailureCount: number;
  providerErrorCount: number;
  byCapability: { capability: string; executions: number; successRate: number; avgLatencyMs: number }[];
  byProvider: { provider: string; executions: number; successRate: number; avgCostUsd: number }[];
  topPerforming: { capability: string; version: string; successRate: number; executions: number }[];
  poorPerforming: { capability: string; version: string; successRate: number; executions: number }[];
  trend: { date: string; executions: number; avgTokens: number; avgCostUsd: number; successRate: number }[];
}

export interface IPromptExecutionReadRepository {
  list(filter: ExecutionListFilter): Promise<{ rows: ExecutionRow[]; total: number }>;
  getAnalyticsSummary(organizationId: string, days: number): Promise<AnalyticsSummary>;
}
