import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AUTOMATION_EXECUTION_RUN_REPOSITORY,
  IAutomationExecutionRunRepository,
} from '../../domain/repositories/automation-execution-run.repository.interface';
import { AutomationExecutionRunEntity } from '../../domain/entities/automation-execution-run.entity';

export class ListAutomationExecutionRunsByStoryQuery {
  constructor(public readonly storyId: string) {}
}

@QueryHandler(ListAutomationExecutionRunsByStoryQuery)
export class ListAutomationExecutionRunsByStoryHandler
  implements IQueryHandler<ListAutomationExecutionRunsByStoryQuery, AutomationExecutionRunEntity[]>
{
  constructor(
    @Inject(AUTOMATION_EXECUTION_RUN_REPOSITORY) private readonly runRepository: IAutomationExecutionRunRepository,
  ) {}

  execute(query: ListAutomationExecutionRunsByStoryQuery): Promise<AutomationExecutionRunEntity[]> {
    return this.runRepository.listByStoryId(query.storyId);
  }
}
