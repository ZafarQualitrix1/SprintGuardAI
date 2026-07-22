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
  error?: string;
}

export interface IAgentRunRepository {
  start(input: StartAgentRunInput): Promise<{ id: string }>;
  complete(input: CompleteAgentRunInput): Promise<void>;
}
