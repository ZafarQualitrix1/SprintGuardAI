import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EXECUTION_REPOSITORY, IExecutionRepository } from '../../domain/repositories/execution.repository.interface';
import { ExecutionEntity } from '../../domain/entities/execution.entity';

export class GetExecutionsByStoryQuery {
  constructor(public readonly storyId: string) {}
}

@QueryHandler(GetExecutionsByStoryQuery)
export class GetExecutionsByStoryHandler implements IQueryHandler<GetExecutionsByStoryQuery, ExecutionEntity[]> {
  constructor(@Inject(EXECUTION_REPOSITORY) private readonly executionRepository: IExecutionRepository) {}

  execute(query: GetExecutionsByStoryQuery): Promise<ExecutionEntity[]> {
    return this.executionRepository.findByStoryId(query.storyId);
  }
}
