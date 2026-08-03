import type { AutomationExecutionRun } from '@sprintguard/database';
import { AutomationExecutionRunEntity, AutomationTestResult } from '../../domain/entities/automation-execution-run.entity';

export function toAutomationExecutionRunEntity(row: AutomationExecutionRun): AutomationExecutionRunEntity {
  return new AutomationExecutionRunEntity(
    row.id,
    row.storyId,
    row.automationGenerationId,
    row.automationType as 'API' | 'UI',
    row.environment,
    row.browser,
    (row.tags as unknown as string[] | null) ?? [],
    row.parallelWorkers,
    row.status,
    row.githubRunId,
    row.githubRunUrl,
    row.totalTests,
    row.passedTests,
    row.failedTests,
    row.skippedTests,
    (row.testResultsJson as unknown as AutomationTestResult[] | null) ?? [],
    row.logsText,
    row.errorMessage,
    row.reportArtifactUrl,
    row.startedAt,
    row.completedAt,
    row.triggeredBy,
    row.createdAt,
  );
}
