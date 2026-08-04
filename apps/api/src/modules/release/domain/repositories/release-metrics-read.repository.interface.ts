import { DefectSeverityLevel } from '../entities/release-report.entity';

export const RELEASE_METRICS_READ_REPOSITORY = Symbol('IReleaseMetricsReadRepository');

export interface RequirementCoverageMetrics {
  totalRequirements: number;
  coveredRequirements: number;
  coveragePercent: number;
}

export interface TestCaseCoverageMetrics {
  totalTestCases: number;
  approvedTestCases: number;
  coveragePercent: number;
}

export interface ManualExecutionMetrics {
  totalTestCases: number;
  executedCount: number;
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  passRate: number;
}

export interface AutomationExecutionMetrics {
  executedCount: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
}

export interface BugRiskMetrics {
  openCounts: Record<DefectSeverityLevel, number>;
}

export interface SprintGates {
  regressionCompleted: boolean;
  deploymentChecklistComplete: boolean;
}

export interface SprintProjectRef {
  sprintId: string;
  projectId: string;
  sprintName: string;
}

// Read-only cross-cutting access into coverage/execution/automation-execution/defect data plus the
// sprint's own release gate toggles, feeding the AI Release Readiness Algorithm (same local-read-
// port pattern used throughout, Solution Architecture §7).
export interface IReleaseMetricsReadRepository {
  findSprintProjectRef(sprintId: string, organizationId: string): Promise<SprintProjectRef | null>;
  getSprintGates(sprintId: string): Promise<SprintGates>;
  getRequirementCoverageMetrics(sprintId: string): Promise<RequirementCoverageMetrics>;
  getTestCaseCoverageMetrics(sprintId: string): Promise<TestCaseCoverageMetrics>;
  getManualExecutionMetrics(sprintId: string): Promise<ManualExecutionMetrics>;
  getAutomationExecutionMetrics(sprintId: string): Promise<AutomationExecutionMetrics>;
  getBugRiskMetrics(sprintId: string): Promise<BugRiskMetrics>;
}
