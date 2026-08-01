export const AI_PROVIDER_STATS_REPOSITORY = Symbol('IAiProviderStatsRepository');

export interface AiProviderStats {
  provider: string;
  totalRequests: number;
  successRate: number; // 0-100
  avgResponseTimeMs: number | null;
}

// Live-computed from AgentRun/AiResponse rather than a maintained counter table -- keeps the
// Providers tab honest about what actually ran, with no separate write path to fall out of sync.
export interface IAiProviderStatsRepository {
  listByOrg(organizationId: string): Promise<AiProviderStats[]>;
}
