export type AgentRunStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'RETRYING' | 'FLAGGED_FOR_REVIEW';

export class AgentRunEntity {
  constructor(
    public readonly id: string,
    public readonly agentKey: string,
    public readonly organizationId: string,
    public readonly correlationId: string,
    public readonly status: AgentRunStatus,
    public readonly confidenceScore: number | null,
  ) {}
}
