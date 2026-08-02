export type PromptStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'ACTIVE' | 'DEPRECATED';
export type ApprovalDecision = 'APPROVED' | 'REJECTED';

export class PromptApprovalEntity {
  constructor(
    public readonly id: string,
    public readonly promptId: string,
    public readonly reviewerId: string,
    public readonly reviewerName: string,
    public readonly decision: ApprovalDecision,
    public readonly rationale: string | null,
    public readonly createdAt: Date,
  ) {}
}

export class PromptEntity {
  constructor(
    public readonly id: string,
    public readonly capability: string,
    public readonly version: string,
    public readonly template: string,
    public readonly jsonSchema: unknown,
    public readonly status: PromptStatus,
    public readonly isActive: boolean,
    public readonly createdBy: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly name: string | null,
    public readonly description: string | null,
    public readonly category: string | null,
    public readonly tags: string[],
    public readonly changeSummary: string | null,
    public readonly approvals: PromptApprovalEntity[] = [],
  ) {}
}

// Row shape for the Prompt Library table -- one row per capability (its latest version), joined
// with aggregate execution stats from AgentRun/AiResponse. Kept separate from PromptEntity since
// the list view never needs the full template body.
export interface PromptLibraryRow {
  id: string;
  capability: string;
  version: string;
  name: string | null;
  category: string | null;
  status: PromptStatus;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  agentKey: string | null;
  agentName: string | null;
  provider: string | null;
  model: string | null;
  totalExecutions: number;
  successRate: number | null;
  avgLatencyMs: number | null;
  avgTokens: number | null;
  avgConfidenceScore: number | null;
  lastUsedAt: Date | null;
}
