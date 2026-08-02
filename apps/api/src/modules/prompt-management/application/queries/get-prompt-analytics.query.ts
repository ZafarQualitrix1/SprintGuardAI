import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  PROMPT_EXECUTION_READ_REPOSITORY,
  IPromptExecutionReadRepository,
  AnalyticsSummary,
} from '../../domain/repositories/prompt-execution-read.repository.interface';

export class GetPromptAnalyticsQuery {
  constructor(
    public readonly organizationId: string,
    public readonly days: number = 30,
  ) {}
}

@QueryHandler(GetPromptAnalyticsQuery)
export class GetPromptAnalyticsHandler implements IQueryHandler<GetPromptAnalyticsQuery, AnalyticsSummary> {
  constructor(
    @Inject(PROMPT_EXECUTION_READ_REPOSITORY) private readonly executionRepository: IPromptExecutionReadRepository,
  ) {}

  execute(query: GetPromptAnalyticsQuery): Promise<AnalyticsSummary> {
    return this.executionRepository.getAnalyticsSummary(query.organizationId, query.days);
  }
}
