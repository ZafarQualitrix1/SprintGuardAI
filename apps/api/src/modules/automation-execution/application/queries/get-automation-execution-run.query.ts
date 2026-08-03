import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AUTOMATION_EXECUTION_RUN_REPOSITORY,
  IAutomationExecutionRunRepository,
} from '../../domain/repositories/automation-execution-run.repository.interface';
import { AutomationExecutionRunEntity } from '../../domain/entities/automation-execution-run.entity';

export class GetAutomationExecutionRunQuery {
  constructor(public readonly runId: string) {}
}

@QueryHandler(GetAutomationExecutionRunQuery)
export class GetAutomationExecutionRunHandler
  implements IQueryHandler<GetAutomationExecutionRunQuery, AutomationExecutionRunEntity>
{
  constructor(
    @Inject(AUTOMATION_EXECUTION_RUN_REPOSITORY) private readonly runRepository: IAutomationExecutionRunRepository,
  ) {}

  async execute(query: GetAutomationExecutionRunQuery): Promise<AutomationExecutionRunEntity> {
    const run = await this.runRepository.findById(query.runId);
    if (!run) {
      throw new NotFoundException('Automation execution run not found');
    }
    return run;
  }
}
