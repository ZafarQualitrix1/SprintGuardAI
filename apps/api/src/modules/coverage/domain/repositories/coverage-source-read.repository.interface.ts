export const COVERAGE_SOURCE_READ_REPOSITORY = Symbol('ICoverageSourceReadRepository');

export interface AcceptanceCriterionCoverageSource {
  id: string;
  hasTestCase: boolean;
  firstTestCaseId: string | null;
}

export interface RequirementCoverageSource {
  id: string;
  text: string;
  acceptanceCriteria: AcceptanceCriterionCoverageSource[];
}

export interface SprintCoverageSource {
  projectId: string;
  sprintId: string;
  sprintName: string;
  requirements: RequirementCoverageSource[];
  existingTestCaseTitles: string[];
}

// Read-only cross-cutting access into requirement-intelligence's/test-intelligence's
// Story -> Requirement -> AcceptanceCriterion -> TestScenario -> TestCase chain -- same
// local-read-port pattern as IReleaseMetricsReadRepository (release/domain/repositories),
// pre-shaped so the pure derivation function (application/utils/derive-coverage.util.ts)
// never touches a raw Prisma row.
export interface ICoverageSourceReadRepository {
  getSprintCoverageSource(sprintId: string, organizationId: string): Promise<SprintCoverageSource | null>;
}
