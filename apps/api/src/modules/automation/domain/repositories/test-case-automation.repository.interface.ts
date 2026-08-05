export const TEST_CASE_AUTOMATION_REPOSITORY = Symbol('ITestCaseAutomationRepository');

export interface TestCaseAutomationContext {
  id: string;
  displayId: string | null;
  title: string;
  description: string | null;
  steps: { step: string; expected: string }[];
  testData: unknown;
  priority: string;
  testType: string;
  automationStatus: string;
  automationType: string;
  apiEndpoint: string | null;
  requestMethod: string | null;
  uiScreen: string | null;
  storyId: string;
  storyExternalId: string | null;
  storyTitle: string;
  scenarioId: string;
  scenarioTitle: string;
  sprintId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Narrows a candidate listing to a Project/Sprint/Story slice -- same optional-filter shape used by
// both listApprovedApiCandidates and reclassifyStaleCandidates so the API Automation module's
// Project -> Sprint -> Story filter cascade maps directly onto one query shape.
export interface AutomationCandidateFilters {
  projectId?: string;
  sprintId?: string;
  storyIds?: string[];
}

// Read-only access into `test-intelligence`'s TestCase data (same cross-module read-port pattern
// as execution's ITestCaseReadRepository) plus one narrow write -- flipping AUTOMATABLE ->
// AUTOMATED after a successful generation, which belongs to this module's concern, not
// test-intelligence's.
export interface ITestCaseAutomationRepository {
  findById(testCaseId: string, organizationId: string): Promise<TestCaseAutomationContext | null>;
  listCandidatesBySprintId(sprintId: string, organizationId: string): Promise<TestCaseAutomationContext[]>;
  // API Automation module: only ever BA-approved + locked stories, API-type candidates only --
  // "if a User Story is not approved by BA it must never appear inside API Automation" is enforced
  // here at the query level (defense in depth alongside GenerateAutomationCommand's own check).
  listApprovedApiCandidates(
    organizationId: string,
    filters?: AutomationCandidateFilters,
  ): Promise<TestCaseAutomationContext[]>;
  markAutomated(testCaseId: string): Promise<void>;
  // Self-healing backfill for test cases generated before the AI reliably classified
  // automationStatus/automationType (both left at their MANUAL/NONE defaults -- see
  // test-generation.schema.ts). Any such case that already has an apiEndpoint or uiScreen set is
  // clearly describing an API/UI interaction, so it's reclassified as AUTOMATABLE with the
  // matching type. Returns the number of test cases updated.
  reclassifyStaleCandidates(organizationId: string, filters?: AutomationCandidateFilters): Promise<number>;
}
