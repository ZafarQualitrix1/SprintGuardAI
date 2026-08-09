import type { AgentRunStatus, PromptStatus } from '../enums';

export interface PromptApproval {
  id: string;
  reviewerId: string;
  reviewerName: string;
  decision: 'APPROVED' | 'REJECTED';
  rationale: string | null;
  createdAt: string;
}

export interface Prompt {
  id: string;
  capability: string;
  version: string;
  template: string;
  jsonSchema: unknown;
  status: PromptStatus;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  name: string | null;
  description: string | null;
  category: string | null;
  tags: string[];
  changeSummary: string | null;
  approvals: PromptApproval[];
}

export interface PromptLibraryRow {
  id: string;
  capability: string;
  version: string;
  name: string | null;
  category: string | null;
  status: PromptStatus;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  agentKey: string | null;
  agentName: string | null;
  provider: string | null;
  model: string | null;
  totalExecutions: number;
  successRate: number | null;
  avgLatencyMs: number | null;
  avgTokens: number | null;
  avgConfidenceScore: number | null;
  lastUsedAt: string | null;
}

export interface PromptDiffLine {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

export interface PromptComparisonResult {
  a: Prompt;
  b: Prompt;
  templateDiff: PromptDiffLine[];
}

export interface PromptPlaygroundResult {
  success: boolean;
  rawText?: string;
  parsedOutput?: unknown;
  confidenceScore?: number;
  tokensUsed?: number;
  costUsd?: number;
  latencyMs?: number;
  agentRunId?: string;
  errorMessage?: string;
}

export interface PromptExecutionRow {
  id: string;
  timestamp: string;
  capability: string;
  agentKey: string | null;
  promptVersion: string | null;
  provider: string;
  model: string;
  status: AgentRunStatus;
  latencyMs: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  confidenceScore: number | null;
  failureReason: string | null;
  correlationId: string;
  isPlayground: boolean;
}

export interface PromptAnalyticsSummary {
  totalExecutions: number;
  successRate: number;
  failureRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  avgTokens: number;
  avgCostUsd: number;
  avgConfidenceScore: number;
  retriedExecutionsCount: number;
  validationFailureCount: number;
  providerErrorCount: number;
  byCapability: { capability: string; executions: number; successRate: number; avgLatencyMs: number }[];
  byProvider: { provider: string; executions: number; successRate: number; avgCostUsd: number }[];
  topPerforming: { capability: string; version: string; successRate: number; executions: number }[];
  poorPerforming: { capability: string; version: string; successRate: number; executions: number }[];
  trend: { date: string; executions: number; avgTokens: number; avgCostUsd: number; successRate: number }[];
}

export interface CreatePromptInput {
  capability: string;
  agentKey: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  template: string;
  jsonSchema?: Record<string, unknown>;
}

export interface CreatePromptVersionInput {
  template: string;
  jsonSchema?: Record<string, unknown>;
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  changeSummary?: string;
}

export interface UpdatePromptDraftInput {
  template?: string;
  jsonSchema?: Record<string, unknown>;
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  changeSummary?: string;
}
