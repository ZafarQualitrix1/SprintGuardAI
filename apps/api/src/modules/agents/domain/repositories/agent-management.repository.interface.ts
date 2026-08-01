export const AGENT_MANAGEMENT_REPOSITORY = Symbol('IAgentManagementRepository');

export interface AgentSummary {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: string;
  isBuiltIn: boolean;
  avgLatencyMs: number | null;
  avgConfidenceScore: number | null;
  successRate: number; // 0-100
  totalExecutions: number;
  lastExecutionAt: string | null;
}

// Agent is a global catalog (not org-scoped in the schema) -- execution stats are scoped to the
// querying organization's AgentRun/AiResponse rows, live-computed rather than a maintained counter.
export interface IAgentManagementRepository {
  listWithStats(organizationId: string): Promise<AgentSummary[]>;
  setStatus(key: string, status: 'ENABLED' | 'DISABLED'): Promise<{ id: string; key: string; status: string }>;
}
