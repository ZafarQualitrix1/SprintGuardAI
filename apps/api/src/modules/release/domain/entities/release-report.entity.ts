export type ReleaseReportStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED';

// Final go/no-go gate state (Mandatory Release Rules + Final Release Decision Logic).
export type ReleaseGateStatus = 'BLOCKED' | 'NEEDS_PM_APPROVAL' | 'CONDITIONAL_APPROVAL' | 'APPROVED';

// AI Risk Categories, banded on the raw readiness score.
export type ReleaseRiskCategory = 'PRODUCTION_READY' | 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' | 'NOT_RECOMMENDED';

export const DEFECT_SEVERITIES = ['BLOCKER', 'CRITICAL', 'HIGH', 'MAJOR', 'MEDIUM', 'MINOR', 'TRIVIAL'] as const;
export type DefectSeverityLevel = (typeof DEFECT_SEVERITIES)[number];

export interface BugRiskBreakdown {
  openCounts: Record<DefectSeverityLevel, number>;
  totalDeduction: number; // sum of (count * per-severity deduction), always <= 0
  component: number; // bugRiskWeight + totalDeduction, NOT clamped -- can go negative
}

export interface MandatoryRuleFlag {
  rule: string; // short machine-readable code, e.g. "BLOCKER_BUG_OPEN"
  message: string; // human-readable, e.g. "Incomplete Scope"
  severity: 'BLOCK' | 'WARNING';
}

export interface ReleaseReportBreakdown {
  // Requirement Coverage (weighted)
  requirementCoveragePercent: number;
  totalRequirements: number;
  coveredRequirements: number;

  // Test Case Coverage: generated vs BA-approved (weighted)
  testCaseCoveragePercent: number;
  totalTestCases: number;
  approvedTestCases: number;

  // Manual Execution Pass Rate (weighted) -- Passed / Executed, latest status per test case
  manualPassRate: number;
  manualExecutedCount: number;
  manualPassedCount: number;
  manualFailedCount: number;
  manualPendingCount: number;

  // Automation Execution Pass Rate (weighted)
  automationPassRate: number;
  automationExecutedCount: number;
  automationPassedCount: number;
  automationFailedCount: number;

  // Open Bug Risk (weighted, biggest contributor, can go negative)
  bugRisk: BugRiskBreakdown;

  // Gates
  regressionCompleted: boolean;
  deploymentChecklistComplete: boolean;

  // Derived outputs
  riskCategory: ReleaseRiskCategory;
  releaseStatus: ReleaseGateStatus;
  deploymentProbability: number; // 0-100, 0 when BLOCKED
  deploymentLabel: string;
  mandatoryFlags: MandatoryRuleFlag[];
  // AI Recommendation Panel: deterministic, always-available action items derived from the same
  // breakdown as the score itself (never a separate AI call, so it can never be "unavailable").
  recommendations: string[];

  // Legacy fields kept for backward compatibility with existing analytics/dashboard readers
  // (apps/web analytics page, prisma-analytics-read.repository averageLatestReadiness).
  coveragePercent: number;
  executionPassRate: number;
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
