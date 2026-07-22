export interface TestStep {
  step: string;
  expected: string;
}

export interface TestCase {
  id: string;
  title: string;
  steps: TestStep[];
  priority: string;
}

export interface TestScenario {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  testCases: TestCase[];
}
