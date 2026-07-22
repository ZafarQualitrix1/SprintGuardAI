export const RELEASE_METRICS_READ_REPOSITORY = Symbol('IReleaseMetricsReadRepository');

export interface CoverageMetrics {
  totalRequirements: number;
  coveredRequirements: number;
  coveragePercent: number;
}

export interface ExecutionMetrics {
  totalTestCases: number;
  executedCount: number;
  passedCount: number;
  failedCount: number;
  executionPassRate: number;
}

export interface SprintProjectRef {
  sprintId: string;
  projectId: string;
}

// Read-only cross-cutting access into `coverage`'s CoverageMatrixEntry and `execution`'s Execution
// data, plus `sprint`'s Project/Sprint relationship -- same local-read-port pattern used
// throughout (Solution Architecture §7).
export interface IReleaseMetricsReadRepository {
  findSprintProjectRef(sprintId: string, organizationId: string): Promise<SprintProjectRef | null>;
  getCoverageMetrics(sprintId: string): Promise<CoverageMetrics>;
  getExecutionMetrics(sprintId: string): Promise<ExecutionMetrics>;
}
