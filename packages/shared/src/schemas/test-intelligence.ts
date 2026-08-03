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
  displayId: string | null;
  testObjective: string | null;
  preconditions: string[] | null;
  dependencies: string | null;
  requestMethod: string | null;
  requestPayload: Record<string, unknown> | null;
  expectedStatusCode: number | null;
  expectedResponse: string | null;
  remarks: string | null;
}

export interface TestScenario {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  testCases: TestCase[];
}
