import { AgentRunStatus } from '../entities/agent-run.entity';

export const AGENT_RUN_REPOSITORY = Symbol('IAgentRunRepository');

export interface StartAgentRunInput {
  agentId: string;
  organizationId: string;
  correlationId: string;
  input: unknown;
  provider: string;
  model: string;
}

export interface CompleteAgentRunInput {
  id: string;
  status: Extract<AgentRunStatus, 'SUCCEEDED' | 'FAILED' | 'FLAGGED_FOR_REVIEW'>;
  output?: unknown;
  confidenceScore?: number;
  tokensUsed?: number;
  costUsd?: number;
  error?: string;
  // Set only when a fallback provider (AI Settings §12) actually served the run, so the recorded
  // provider/model reflects reality rather than the primary provider chosen at start().
  provider?: string;
  model?: string;
}

export interface IAgentRunRepository {
  start(input: StartAgentRunInput): Promise<{ id: string }>;
  complete(input: CompleteAgentRunInput): Promise<void>;
}
