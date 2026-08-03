import { AutomationExecutionRunEntity } from '../domain/entities/automation-execution-run.entity';
import { AutomationExecutionRunDto } from './dto/automation-execution.dto';

export function toAutomationExecutionRunDto(entity: AutomationExecutionRunEntity): AutomationExecutionRunDto {
  return {
    id: entity.id,
    storyId: entity.storyId,
    automationGenerationId: entity.automationGenerationId,
    automationType: entity.automationType,
    environment: entity.environment,
    browser: entity.browser,
    tags: entity.tags,
    parallelWorkers: entity.parallelWorkers,
    status: entity.status,
    githubRunId: entity.githubRunId,
    githubRunUrl: entity.githubRunUrl,
    totalTests: entity.totalTests,
    passedTests: entity.passedTests,
    failedTests: entity.failedTests,
    skippedTests: entity.skippedTests,
    testResults: entity.testResults,
    logsText: entity.logsText,
    errorMessage: entity.errorMessage,
    reportArtifactUrl: entity.reportArtifactUrl,
    startedAt: entity.startedAt ? entity.startedAt.toISOString() : null,
    completedAt: entity.completedAt ? entity.completedAt.toISOString() : null,
    triggeredBy: entity.triggeredBy,
    createdAt: entity.createdAt.toISOString(),
  };
}
