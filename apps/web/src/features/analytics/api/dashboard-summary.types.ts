export interface VelocityPoint {
  sprintName: string;
  pointsCompleted: number;
}

export interface DashboardSummary {
  projectsCount: number;
  activeSprintsCount: number;
  avgCoveragePercent: number | null;
  openRisksCount: number;
  releaseReadinessPercent: number | null;
  velocityTrend: VelocityPoint[];
}
