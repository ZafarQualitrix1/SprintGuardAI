export interface TestStep {
  step: string;
  expected: string;
}

export interface TestCase {
  id: string;
  title: string;
  steps: TestStep[];
  priority: string;
  description: string | null;
  severity: string;
  module: string | null;
  testType: string;
  tags: string[];
  automationStatus: string;
  automationType: string;
  apiEndpoint: string | null;
  uiScreen: string | null;
}

export interface TestScenario {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  testCases: TestCase[];
}
