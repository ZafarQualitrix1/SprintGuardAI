import { Priority, TestCaseEntity, TestStep } from '../entities/test-artifact.entity';

export const TEST_CASE_REPOSITORY = Symbol('ITestCaseRepository');

export interface CreateTestCaseInput {
  title: string;
  steps: TestStep[];
  priority: Priority;
}

export interface ITestCaseRepository {
  /** Replaces existing cases for this scenario (same re-analysis semantics as Requirements, §2). */
  replaceForScenario(testScenarioId: string, cases: CreateTestCaseInput[]): Promise<TestCaseEntity[]>;
}
