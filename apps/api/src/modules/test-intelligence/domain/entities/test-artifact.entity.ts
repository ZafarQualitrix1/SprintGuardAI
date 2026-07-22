export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TestStep {
  step: string;
  expected: string;
}

export class TestCaseEntity {
  constructor(
    public readonly id: string,
    public readonly testScenarioId: string,
    public readonly title: string,
    public readonly steps: TestStep[],
    public readonly priority: Priority,
  ) {}
}

export class TestScenarioEntity {
  constructor(
    public readonly id: string,
    public readonly acceptanceCriterionId: string,
    public readonly storyId: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly priority: Priority,
    public readonly testCases: TestCaseEntity[],
  ) {}
}
