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

// Matches AgentRun.validationStatus's documented values in schema.prisma -- kept as a free-form
// column there (not a DB enum) so a new value here never needs a migration, but the write side is
// still typed against this union.
export type ValidationStatus = 'PASSED_FIRST_TRY' | 'PASSED_AFTER_REPAIR' | 'FAILED_VALIDATION' | 'FAILED_PROVIDER_ERROR';

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
  // Observability (Prompt Management Optimization Phase 5) -- attempts consumed beyond the first,
  // and a structured classification of the final outcome distinct from the free-text `error` above.
  retryCount?: number;
  validationStatus?: ValidationStatus;
}

export interface IAgentRunRepository {
  start(input: StartAgentRunInput): Promise<{ id: string }>;
  complete(input: CompleteAgentRunInput): Promise<void>;
  /**
   * Request deduplication: finds a still-in-flight run (PENDING/RUNNING) for the same org +
   * correlationId, if any. Callers that want deduplication pass a stable correlationId (e.g.
   * `deep-requirement-analysis:${storyId}`) instead of leaving it to default to a fresh random one.
   * Best-effort, not a hard lock -- a check-then-insert race is possible under truly simultaneous
   * requests (no unique constraint backs this), but closes the everyday case this guards against
   * (a slow request still running when the same user clicks the same button again).
   */
  findActiveByCorrelationId(organizationId: string, correlationId: string): Promise<{ id: string; startedAt: Date } | null>;
}
