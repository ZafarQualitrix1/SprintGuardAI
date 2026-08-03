import {
  AutomationStatus,
  AutomationType,
  Priority,
  TestCaseEntity,
  TestStep,
  TestType,
} from '../entities/test-artifact.entity';

export const TEST_CASE_REPOSITORY = Symbol('ITestCaseRepository');

export interface CreateTestCaseInput {
  title: string;
  steps: TestStep[];
  priority: Priority;
  description: string | null;
  severity: Priority;
  module: string | null;
  testType: TestType;
  tags: string[];
  automationStatus: AutomationStatus;
  automationType: AutomationType;
  apiEndpoint: string | null;
  uiScreen: string | null;
  // Enterprise Test Generation fields. displayId is deliberately absent here -- it's minted by the
  // repository itself (Story.testCaseSequenceCounter), never supplied by a caller.
  testObjective: string | null;
  preconditions: string[] | null;
  dependencies: string | null;
  requestMethod: string | null;
  requestPayload: Record<string, unknown> | null;
  expectedStatusCode: number | null;
  expectedResponse: string | null;
  remarks: string | null;
}

export interface TestCaseChangeset {
  storyId: string;
  added: (CreateTestCaseInput & { testScenarioId: string })[];
  modified: (Partial<CreateTestCaseInput> & { id: string })[];
  removedIds: string[];
}

export interface ITestCaseRepository {
  /** Replaces existing cases for this scenario (same re-analysis semantics as Requirements, §2). */
  replaceForScenario(testScenarioId: string, storyId: string, cases: CreateTestCaseInput[]): Promise<TestCaseEntity[]>;
  /**
   * BA Review Workflow's feedback-driven regeneration: targeted add/update/remove, never a blanket
   * deleteMany like replaceForScenario -- preserves every test case the AI didn't flag as needing a
   * change, per the spec's "regenerate only necessary changes while preserving all previously
   * correct test cases."
   */
  applyChangeset(changeset: TestCaseChangeset): Promise<TestCaseEntity[]>;
}
