export type BaReviewApprovalStatus = 'PENDING' | 'FEEDBACK_RECEIVED' | 'APPROVED';

export interface TestCaseDistribution {
  FUNCTIONAL: number;
  NEGATIVE: number;
  BOUNDARY: number;
  VALIDATION: number;
  BUSINESS_RULE: number;
  API: number;
  UI: number;
  SECURITY: number;
  PERFORMANCE: number;
  ACCESSIBILITY: number;
  DATABASE: number;
  INTEGRATION: number;
  REGRESSION: number;
  SMOKE: number;
  SANITY: number;
}

export interface TestCaseSnapshotEntry {
  scenarioId: string;
  scenarioTitle: string;
  testCases: Array<{
    id: string;
    title: string;
    description: string | null;
    steps: { step: string; expected: string }[];
    priority: string;
    severity: string;
    testType: string;
    automationStatus: string;
    // Enterprise Test Generation fields -- optional since snapshots frozen before this migration
    // won't have them.
    displayId?: string | null;
    testObjective?: string | null;
    preconditions?: string[] | null;
    dependencies?: string | null;
    requestMethod?: string | null;
    requestPayload?: Record<string, unknown> | null;
    expectedStatusCode?: number | null;
    expectedResponse?: string | null;
    remarks?: string | null;
  }>;
}

export interface ImprovementSummary {
  feedbackSummary: string;
  added: { title: string; testType: string }[];
  modified: { title: string; changeReason: string }[];
  removedReasons: Record<string, string>;
  coverageImpact: string;
  automationReadinessImpact: string;
  traceabilityImpact: string;
}

export class BaReviewCycleEntity {
  constructor(
    public readonly id: string,
    public readonly storyBaReviewStateId: string,
    public readonly storyId: string,
    public readonly organizationId: string,
    public readonly version: number,
    public readonly documentVersionLabel: string,
    public readonly generatedBy: string | null,
    public readonly generatedAt: Date,
    public readonly aiProvider: string,
    public readonly aiModelVersion: string,
    public readonly promptVersion: string,
    public readonly requirementAnalysisReportId: string | null,
    public readonly testCasesSnapshot: TestCaseSnapshotEntry[],
    public readonly distribution: TestCaseDistribution,
    public readonly totalTestCases: number,
    public readonly coveragePercent: number | null,
    public readonly automationReadinessPercent: number | null,
    public readonly jiraIssueKey: string,
    public readonly jiraCommentId: string | null,
    public readonly jiraAttachmentId: string | null,
    public readonly respondsToFeedbackFromVersionId: string | null,
    public readonly improvementSummary: ImprovementSummary | null,
    public readonly feedbackText: string | null,
    public readonly feedbackAuthor: string | null,
    public readonly feedbackJiraCommentId: string | null,
    public readonly feedbackReceivedAt: Date | null,
    public readonly approvalStatus: BaReviewApprovalStatus,
    public readonly approvedBy: string | null,
    public readonly approvedByUserId: string | null,
    public readonly approvalComment: string | null,
    public readonly approvedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
