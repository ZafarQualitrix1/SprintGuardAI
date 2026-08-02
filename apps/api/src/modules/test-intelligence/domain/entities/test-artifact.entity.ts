export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TestType =
  | 'FUNCTIONAL'
  | 'NEGATIVE'
  | 'BOUNDARY'
  | 'VALIDATION'
  | 'BUSINESS_RULE'
  | 'API'
  | 'UI'
  | 'SECURITY'
  | 'PERFORMANCE'
  | 'ACCESSIBILITY'
  | 'DATABASE'
  | 'INTEGRATION'
  | 'REGRESSION'
  | 'SMOKE'
  | 'SANITY';

export type AutomationType = 'NONE' | 'API' | 'UI';
export type AutomationStatus = 'MANUAL' | 'AUTOMATABLE' | 'AUTOMATED';

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
    public readonly description: string | null,
    public readonly severity: Priority,
    public readonly module: string | null,
    public readonly testType: TestType,
    public readonly tags: string[],
    public readonly automationStatus: AutomationStatus,
    public readonly automationType: AutomationType,
    public readonly apiEndpoint: string | null,
    public readonly uiScreen: string | null,
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
