export type AutomationExecutionStatus = 'QUEUED' | 'RUNNING' | 'PASSED' | 'FAILED' | 'ERROR' | 'CANCELLED';

export interface AutomationTestResult {
  title: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  error?: string;
}

export class AutomationExecutionRunEntity {
  constructor(
    public readonly id: string,
    public readonly storyId: string,
    public readonly automationGenerationId: string,
    public readonly automationType: 'API' | 'UI',
    public readonly environment: string,
    public readonly browser: string | null,
    public readonly tags: string[],
    public readonly parallelWorkers: number,
    public readonly status: AutomationExecutionStatus,
    public readonly githubRunId: string | null,
    public readonly githubRunUrl: string | null,
    public readonly totalTests: number | null,
    public readonly passedTests: number | null,
    public readonly failedTests: number | null,
    public readonly skippedTests: number | null,
    public readonly testResults: AutomationTestResult[],
    public readonly logsText: string | null,
    public readonly errorMessage: string | null,
    public readonly reportArtifactUrl: string | null,
    public readonly startedAt: Date | null,
    public readonly completedAt: Date | null,
    public readonly triggeredBy: string,
    public readonly createdAt: Date,
  ) {}
}
