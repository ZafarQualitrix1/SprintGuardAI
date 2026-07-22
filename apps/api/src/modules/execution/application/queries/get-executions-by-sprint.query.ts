import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EXECUTION_REPOSITORY, IExecutionRepository } from '../../domain/repositories/execution.repository.interface';
import { ExecutionEntity } from '../../domain/entities/execution.entity';

export class GetExecutionsBySprintQuery {
  constructor(public readonly sprintId: string) {}
}

@QueryHandler(GetExecutionsBySprintQuery)
export class GetExecutionsBySprintHandler
  implements IQueryHandler<GetExecutionsBySprintQuery, ExecutionEntity[]>
{
  constructor(@Inject(EXECUTION_REPOSITORY) private readonly executionRepository: IExecutionRepository) {}

  execute(query: GetExecutionsBySprintQuery): Promise<ExecutionEntity[]> {
    return this.executionRepository.findBySprintId(query.sprintId);
  }
}
