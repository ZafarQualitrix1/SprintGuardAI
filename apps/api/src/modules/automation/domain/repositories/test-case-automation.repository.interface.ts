export const TEST_CASE_AUTOMATION_REPOSITORY = Symbol('ITestCaseAutomationRepository');

export interface TestCaseAutomationContext {
  id: string;
  title: string;
  description: string | null;
  steps: { step: string; expected: string }[];
  testData: unknown;
  priority: string;
  testType: string;
  automationStatus: string;
  automationType: string;
  apiEndpoint: string | null;
  uiScreen: string | null;
  storyId: string;
  storyTitle: string;
  scenarioId: string;
  scenarioTitle: string;
  sprintId: string;
}

// Read-only access into `test-intelligence`'s TestCase data (same cross-module read-port pattern
// as execution's ITestCaseReadRepository) plus one narrow write -- flipping AUTOMATABLE ->
// AUTOMATED after a successful generation, which belongs to this module's concern, not
// test-intelligence's.
export interface ITestCaseAutomationRepository {
  findById(testCaseId: string, organizationId: string): Promise<TestCaseAutomationContext | null>;
  listCandidatesBySprintId(sprintId: string, organizationId: string): Promise<TestCaseAutomationContext[]>;
  markAutomated(testCaseId: string): Promise<void>;
}
