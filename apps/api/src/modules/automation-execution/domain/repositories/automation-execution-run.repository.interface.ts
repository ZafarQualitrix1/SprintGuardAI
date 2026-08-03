import { AutomationExecutionRunEntity, AutomationExecutionStatus, AutomationTestResult } from '../entities/automation-execution-run.entity';

export const AUTOMATION_EXECUTION_RUN_REPOSITORY = Symbol('IAutomationExecutionRunRepository');

export interface CreateAutomationExecutionRunInput {
  organizationId: string;
  storyId: string;
  automationGenerationId: string;
  automationType: 'API' | 'UI';
  environment: string;
  browser: string | null;
  tags: string[];
  parallelWorkers: number;
  triggeredBy: string;
}

export interface RunStartedUpdate {
  githubRunId: string;
  githubRunUrl: string;
}

export interface RunCompletedUpdate {
  status: AutomationExecutionStatus;
  totalTests: number | null;
  passedTests: number | null;
  failedTests: number | null;
  skippedTests: number | null;
  testResults: AutomationTestResult[];
  logsText: string | null;
  errorMessage: string | null;
  reportArtifactUrl: string | null;
}

export interface IAutomationExecutionRunRepository {
  create(input: CreateAutomationExecutionRunInput): Promise<AutomationExecutionRunEntity>;
  findById(id: string): Promise<AutomationExecutionRunEntity | null>;
  listByStoryId(storyId: string): Promise<AutomationExecutionRunEntity[]>;
  markStarted(id: string, update: RunStartedUpdate): Promise<AutomationExecutionRunEntity>;
  markCompleted(id: string, update: RunCompletedUpdate): Promise<AutomationExecutionRunEntity>;
  markCancelled(id: string): Promise<AutomationExecutionRunEntity>;
}
