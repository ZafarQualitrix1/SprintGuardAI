import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AI_OPS_READ_REPOSITORY,
  IAiOpsReadRepository,
  ListAiLogsFilters,
  ListAiLogsResult,
} from '../../domain/repositories/ai-ops-read.repository.interface';

export class ListAiLogsQuery {
  constructor(
    public readonly organizationId: string,
    public readonly filters: ListAiLogsFilters,
  ) {}
}

@QueryHandler(ListAiLogsQuery)
export class ListAiLogsHandler implements IQueryHandler<ListAiLogsQuery, ListAiLogsResult> {
  constructor(@Inject(AI_OPS_READ_REPOSITORY) private readonly repository: IAiOpsReadRepository) {}

  execute(query: ListAiLogsQuery): Promise<ListAiLogsResult> {
    return this.repository.listLogs(query.organizationId, query.filters);
  }
}
