export const DEFECT_SEVERITIES = ['BLOCKER', 'CRITICAL', 'HIGH', 'MAJOR', 'MEDIUM', 'MINOR', 'TRIVIAL'] as const;
export type DefectSeverityLevel = (typeof DEFECT_SEVERITIES)[number];

export type ReleaseGateStatus = 'BLOCKED' | 'NEEDS_PM_APPROVAL' | 'CONDITIONAL_APPROVAL' | 'APPROVED';
export type ReleaseRiskCategory = 'PRODUCTION_READY' | 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' | 'NOT_RECOMMENDED';

export interface BugRiskBreakdown {
  openCounts: Record<DefectSeverityLevel, number>;
  totalDeduction: number;
  component: number;
}

export interface MandatoryRuleFlag {
  rule: string;
  message: string;
  severity: 'BLOCK' | 'WARNING';
}

export interface ReleaseReportBreakdown {
  requirementCoveragePercent: number;
  totalRequirements: number;
  coveredRequirements: number;

  testCaseCoveragePercent: number;
  totalTestCases: number;
  approvedTestCases: number;

  manualPassRate: number;
  manualExecutedCount: number;
  manualPassedCount: number;
  manualFailedCount: number;
  manualPendingCount: number;

  automationPassRate: number;
  automationExecutedCount: number;
  automationPassedCount: number;
  automationFailedCount: number;

  bugRisk: BugRiskBreakdown;

  regressionCompleted: boolean;
  deploymentChecklistComplete: boolean;

  riskCategory: ReleaseRiskCategory;
  releaseStatus: ReleaseGateStatus;
  deploymentProbability: number;
  deploymentLabel: string;
  mandatoryFlags: MandatoryRuleFlag[];
  recommendations: string[];

  // Legacy aliases kept for older readers (analytics summary cards, etc.)
  coveragePercent: number;
  executionPassRate: number;
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

export interface ReleaseScoringConfig {
  projectId: string;
  requirementCoverageWeight: number;
  testCaseCoverageWeight: number;
  manualExecutionWeight: number;
  automationExecutionWeight: number;
  bugRiskWeight: number;
  severityDeductions: Record<DefectSeverityLevel, number>;
  manualPassRateBlockThreshold: number;
  automationCoverageWarnThreshold: number;
  isCustomized: boolean;
}

export interface SprintReleaseGates {
  regressionCompleted: boolean;
  deploymentChecklistComplete: boolean;
}
