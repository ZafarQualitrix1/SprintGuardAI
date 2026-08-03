export interface VelocityPoint {
  sprintName: string;
  pointsCompleted: number;
}

export interface StoryStatusBreakdown {
  BACKLOG: number;
  IN_PROGRESS: number;
  IN_REVIEW: number;
  DONE: number;
  BLOCKED: number;
}

export interface ExecutionStatusBreakdown {
  NOT_RUN: number;
  PASSED: number;
  FAILED: number;
  BLOCKED: number;
  SKIPPED: number;
}

export interface DashboardSummary {
  projectsCount: number;
  activeSprintsCount: number;
  avgCoveragePercent: number | null;
  openRisksCount: number;
  releaseReadinessPercent: number | null;
  velocityTrend: VelocityPoint[];
  totalTestCases: number;
  openDefectsCount: number;
  storyStatusBreakdown: StoryStatusBreakdown;
  executionStatusBreakdown: ExecutionStatusBreakdown;
}
