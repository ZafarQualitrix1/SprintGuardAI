import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AI_OPS_READ_REPOSITORY,
  AiUsageSummary,
  IAiOpsReadRepository,
} from '../../domain/repositories/ai-ops-read.repository.interface';

export class GetAiUsageSummaryQuery {
  constructor(public readonly organizationId: string) {}
}

@QueryHandler(GetAiUsageSummaryQuery)
export class GetAiUsageSummaryHandler implements IQueryHandler<GetAiUsageSummaryQuery, AiUsageSummary> {
  constructor(@Inject(AI_OPS_READ_REPOSITORY) private readonly repository: IAiOpsReadRepository) {}

  execute(query: GetAiUsageSummaryQuery): Promise<AiUsageSummary> {
    return this.repository.getUsageSummary(query.organizationId);
  }
}
