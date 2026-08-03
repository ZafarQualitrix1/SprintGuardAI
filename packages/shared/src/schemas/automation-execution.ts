export interface AutomationTestResult {
  title: string;
  status: string;
  durationMs: number;
  error?: string;
}

export interface AutomationExecutionRun {
  id: string;
  storyId: string;
  automationGenerationId: string;
  automationType: string;
  environment: string;
  browser: string | null;
  tags: string[];
  parallelWorkers: number;
  status: 'QUEUED' | 'RUNNING' | 'PASSED' | 'FAILED' | 'ERROR' | 'CANCELLED';
  githubRunId: string | null;
  githubRunUrl: string | null;
  totalTests: number | null;
  passedTests: number | null;
  failedTests: number | null;
  skippedTests: number | null;
  testResults: AutomationTestResult[];
  logsText: string | null;
  errorMessage: string | null;
  reportArtifactUrl: string | null;
  startedAt: string | null;
  completedAt: string | null;
  triggeredBy: string;
  createdAt: string;
}

export interface TriggerAutomationExecutionInput {
  automationGenerationId: string;
  environment: string;
  browser?: string;
  tags?: string[];
  parallelWorkers?: number;
}
