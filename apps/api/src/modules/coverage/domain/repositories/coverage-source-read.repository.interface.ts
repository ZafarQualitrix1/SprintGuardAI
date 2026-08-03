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

// Widened per-test-case shape needed for the story-scoped dimension breakdown (API/UI/Security/
// .../Automation/Manual coverage) -- the sprint-wide source above only ever needs `id` because it
// doesn't compute per-category percentages.
export interface TestCaseCoverageSource {
  id: string;
  title: string;
  testType: string;
  automationStatus: string;
  priority: string;
}

export interface AcceptanceCriterionStoryCoverageSource extends AcceptanceCriterionCoverageSource {
  given: string;
  when: string;
  then: string;
  testCases: TestCaseCoverageSource[];
}

export interface RequirementStoryCoverageSource {
  id: string;
  text: string;
  acceptanceCriteria: AcceptanceCriterionStoryCoverageSource[];
}

export interface StoryCoverageSource {
  projectId: string;
  sprintId: string;
  storyId: string;
  storyTitle: string;
  requirements: RequirementStoryCoverageSource[];
  existingTestCaseTitles: string[];
}

// Read-only cross-cutting access into requirement-intelligence's/test-intelligence's
// Story -> Requirement -> AcceptanceCriterion -> TestScenario -> TestCase chain -- same
// local-read-port pattern as IReleaseMetricsReadRepository (release/domain/repositories),
// pre-shaped so the pure derivation function (application/utils/derive-coverage.util.ts)
// never touches a raw Prisma row.
export interface ICoverageSourceReadRepository {
  getSprintCoverageSource(sprintId: string, organizationId: string): Promise<SprintCoverageSource | null>;
  getStoryCoverageSource(storyId: string, organizationId: string): Promise<StoryCoverageSource | null>;
}
