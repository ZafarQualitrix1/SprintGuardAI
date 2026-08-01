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
}

export interface IAnalyticsReadRepository {
  getDashboardSummary(organizationId: string): Promise<DashboardSummaryResult>;
}
