import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AUTOMATION_EXECUTION_RUN_REPOSITORY,
  IAutomationExecutionRunRepository,
} from '../../domain/repositories/automation-execution-run.repository.interface';
import {
  AUTOMATION_RUN_CONTEXT_READ_REPOSITORY,
  AutomationFile,
  IAutomationRunContextReadRepository,
} from '../../domain/repositories/automation-run-context-read.repository.interface';

// Called by the dispatched workflow (InternalSecretGuard, not a logged-in user) to fetch the
// exact framework + spec files it needs to write to disk before running `npx playwright test`.
export class GetRunAutomationFilesQuery {
  constructor(public readonly runId: string) {}
}

@QueryHandler(GetRunAutomationFilesQuery)
export class GetRunAutomationFilesHandler implements IQueryHandler<GetRunAutomationFilesQuery, AutomationFile[]> {
  constructor(
    @Inject(AUTOMATION_EXECUTION_RUN_REPOSITORY) private readonly runRepository: IAutomationExecutionRunRepository,
    @Inject(AUTOMATION_RUN_CONTEXT_READ_REPOSITORY)
    private readonly contextReadRepository: IAutomationRunContextReadRepository,
  ) {}

  async execute(query: GetRunAutomationFilesQuery): Promise<AutomationFile[]> {
    const run = await this.runRepository.findById(query.runId);
    if (!run) {
      throw new NotFoundException('Automation execution run not found');
    }
    const files = await this.contextReadRepository.findFilesByGenerationId(run.automationGenerationId);
    if (!files) {
      throw new NotFoundException('Automation generation not found');
    }
    return files;
  }
}
