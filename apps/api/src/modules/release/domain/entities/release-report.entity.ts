export type ReleaseReportStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED';

export interface ReleaseReportBreakdown {
  coveragePercent: number;
  executionPassRate: number;
  totalTestCases: number;
  executedCount: number;
  passedCount: number;
  failedCount: number;
}

export class ReleaseReportEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly sprintId: string,
    public readonly readinessScore: number,
    public readonly executiveSummary: string | null,
    public readonly breakdown: ReleaseReportBreakdown,
    public readonly status: ReleaseReportStatus,
    public readonly createdAt: Date,
  ) {}
}
