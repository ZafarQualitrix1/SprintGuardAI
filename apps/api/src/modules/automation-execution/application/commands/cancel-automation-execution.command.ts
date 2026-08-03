import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  AUTOMATION_EXECUTION_RUN_REPOSITORY,
  IAutomationExecutionRunRepository,
} from '../../domain/repositories/automation-execution-run.repository.interface';
import { AutomationExecutionRunEntity } from '../../domain/entities/automation-execution-run.entity';

// Best-effort/local-only: marks the run CANCELLED in SprintGuard immediately so the UI stops
// polling and shows a clear terminal state. It does not also call GitHub's "cancel workflow run"
// API -- the dispatched job may finish anyway and its callback will simply arrive after the run is
// already CANCELLED, at which point markCompleted just overwrites the (already-terminal) row, which
// is harmless.
export class CancelAutomationExecutionCommand {
  constructor(public readonly runId: string) {}
}

@CommandHandler(CancelAutomationExecutionCommand)
export class CancelAutomationExecutionHandler
  implements ICommandHandler<CancelAutomationExecutionCommand, AutomationExecutionRunEntity>
{
  constructor(
    @Inject(AUTOMATION_EXECUTION_RUN_REPOSITORY) private readonly runRepository: IAutomationExecutionRunRepository,
  ) {}

  async execute(command: CancelAutomationExecutionCommand): Promise<AutomationExecutionRunEntity> {
    const existing = await this.runRepository.findById(command.runId);
    if (!existing) {
      throw new NotFoundException('Automation execution run not found');
    }
    if (existing.status === 'PASSED' || existing.status === 'FAILED' || existing.status === 'CANCELLED') {
      throw new BadRequestException('This run has already finished');
    }
    return this.runRepository.markCancelled(command.runId);
  }
}
