export const ANALYTICS_READ_REPOSITORY = Symbol('IAnalyticsReadRepository');

export interface VelocityPoint {
  sprintName: string;
  pointsCompleted: number;
}

export interface DashboardSummaryResult {
  projectsCount: number;
  activeSprintsCount: number;
  avgCoveragePercent: number | null;
  openRisksCount: number;
  releaseReadinessPercent: number | null;
  velocityTrend: VelocityPoint[];
  totalTestCases: number;
  openDefectsCount: number;
  storyStatusBreakdown: Record<'BACKLOG' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED', number>;
  executionStatusBreakdown: Record<'NOT_RUN' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED', number>;
}

export interface IAnalyticsReadRepository {
  getDashboardSummary(organizationId: string): Promise<DashboardSummaryResult>;
}
