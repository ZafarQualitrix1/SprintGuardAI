import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import {
  AUTOMATION_EXECUTION_RUN_REPOSITORY,
  IAutomationExecutionRunRepository,
} from '../../domain/repositories/automation-execution-run.repository.interface';
import {
  AUTOMATION_RUN_CONTEXT_READ_REPOSITORY,
  IAutomationRunContextReadRepository,
} from '../../domain/repositories/automation-run-context-read.repository.interface';
import { AutomationExecutionRunEntity } from '../../domain/entities/automation-execution-run.entity';
import { GithubActionsService } from '../../infrastructure/services/github-actions.service';

export class TriggerAutomationExecutionCommand {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
    public readonly automationGenerationId: string,
    public readonly environment: string,
    public readonly browser: string | null,
    public readonly tags: string[],
    public readonly parallelWorkers: number,
    public readonly actorId: string,
  ) {}
}

// Also backs "Re-run Failed" -- the caller just dispatches a fresh TriggerAutomationExecutionCommand
// against the same automationGenerationId, which always creates a new run row rather than mutating
// the old one, so execution history is never overwritten.
@CommandHandler(TriggerAutomationExecutionCommand)
export class TriggerAutomationExecutionHandler
  implements ICommandHandler<TriggerAutomationExecutionCommand, AutomationExecutionRunEntity>
{
  constructor(
    @Inject(AUTOMATION_EXECUTION_RUN_REPOSITORY) private readonly runRepository: IAutomationExecutionRunRepository,
    @Inject(AUTOMATION_RUN_CONTEXT_READ_REPOSITORY)
    private readonly contextReadRepository: IAutomationRunContextReadRepository,
    private readonly githubActionsService: GithubActionsService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: TriggerAutomationExecutionCommand): Promise<AutomationExecutionRunEntity> {
    const generation = await this.contextReadRepository.findGenerationForStory(
      command.automationGenerationId,
      command.storyId,
      command.organizationId,
    );
    if (!generation) {
      throw new NotFoundException('Automation generation not found for this story');
    }
    if (generation.automationType === 'UI' && !command.browser) {
      throw new BadRequestException('A browser (chromium/firefox/webkit) is required for UI automation runs');
    }

    const run = await this.runRepository.create({
      organizationId: command.organizationId,
      storyId: command.storyId,
      automationGenerationId: command.automationGenerationId,
      automationType: generation.automationType,
      environment: command.environment,
      browser: command.browser,
      tags: command.tags,
      parallelWorkers: command.parallelWorkers,
      triggeredBy: command.actorId,
    });

    const appUrl = this.configService.get<string>('app.url');
    try {
      await this.githubActionsService.dispatchWorkflow({
        runId: run.id,
        automationGenerationId: command.automationGenerationId,
        automationType: generation.automationType,
        environment: command.environment,
        browser: command.browser ?? '',
        tags: command.tags.join(','),
        parallelWorkers: String(command.parallelWorkers),
        callbackBaseUrl: `${appUrl}/api/v1/internal/automation-execution/${run.id}`,
      });
    } catch (error) {
      await this.runRepository.markCompleted(run.id, {
        status: 'ERROR',
        totalTests: null,
        passedTests: null,
        failedTests: null,
        skippedTests: null,
        testResults: [],
        logsText: null,
        errorMessage: error instanceof Error ? error.message : String(error),
        reportArtifactUrl: null,
      });
      throw error;
    }

    return run;
  }
}
