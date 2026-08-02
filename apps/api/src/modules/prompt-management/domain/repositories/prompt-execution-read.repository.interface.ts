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
  // AgentRun/AiResponse only ever store a combined token count -- no input/output split exists in
  // the schema, so this is reported as a single honest number rather than fabricating a split.
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
  avgTokens: number;
  avgCostUsd: number;
  avgConfidenceScore: number;
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
