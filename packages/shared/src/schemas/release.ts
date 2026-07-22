export interface ReleaseReportBreakdown {
  coveragePercent: number;
  executionPassRate: number;
  totalTestCases: number;
  executedCount: number;
  passedCount: number;
  failedCount: number;
}

export interface ReleaseReport {
  id: string;
  sprintId: string;
  readinessScore: number;
  executiveSummary: string | null;
  breakdown: ReleaseReportBreakdown;
  status: string;
  createdAt: string;
}
