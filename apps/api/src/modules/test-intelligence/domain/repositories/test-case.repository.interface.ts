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
}

export interface ITestCaseRepository {
  /** Replaces existing cases for this scenario (same re-analysis semantics as Requirements, §2). */
  replaceForScenario(testScenarioId: string, cases: CreateTestCaseInput[]): Promise<TestCaseEntity[]>;
}
