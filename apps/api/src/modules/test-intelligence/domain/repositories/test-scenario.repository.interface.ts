import { Priority, TestScenarioEntity } from '../entities/test-artifact.entity';

export const TEST_SCENARIO_REPOSITORY = Symbol('ITestScenarioRepository');

export interface CreateTestScenarioInput {
  title: string;
  description: string | null;
  priority: Priority;
}

export interface ITestScenarioRepository {
  /** Replaces existing scenarios for this AC (same re-analysis semantics as Requirements, §2). */
  replaceForAcceptanceCriterion(
    acceptanceCriterionId: string,
    storyId: string,
    scenarios: CreateTestScenarioInput[],
  ): Promise<TestScenarioEntity[]>;
  findByStoryId(storyId: string): Promise<TestScenarioEntity[]>;
  findById(id: string): Promise<TestScenarioEntity | null>;
}
