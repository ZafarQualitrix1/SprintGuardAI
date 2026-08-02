import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  PROMPT_EXECUTION_READ_REPOSITORY,
  IPromptExecutionReadRepository,
  ExecutionListFilter,
  ExecutionRow,
} from '../../domain/repositories/prompt-execution-read.repository.interface';

export class ListPromptExecutionsQuery {
  constructor(public readonly filter: ExecutionListFilter) {}
}

@QueryHandler(ListPromptExecutionsQuery)
export class ListPromptExecutionsHandler
  implements IQueryHandler<ListPromptExecutionsQuery, { rows: ExecutionRow[]; total: number }>
{
  constructor(
    @Inject(PROMPT_EXECUTION_READ_REPOSITORY) private readonly executionRepository: IPromptExecutionReadRepository,
  ) {}

  execute(query: ListPromptExecutionsQuery) {
    return this.executionRepository.list(query.filter);
  }
}
