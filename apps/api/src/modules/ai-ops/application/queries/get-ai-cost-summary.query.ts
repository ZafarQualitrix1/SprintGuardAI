import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AI_OPS_READ_REPOSITORY,
  AiCostSummary,
  IAiOpsReadRepository,
} from '../../domain/repositories/ai-ops-read.repository.interface';

export class GetAiCostSummaryQuery {
  constructor(public readonly organizationId: string) {}
}

@QueryHandler(GetAiCostSummaryQuery)
export class GetAiCostSummaryHandler implements IQueryHandler<GetAiCostSummaryQuery, AiCostSummary> {
  constructor(@Inject(AI_OPS_READ_REPOSITORY) private readonly repository: IAiOpsReadRepository) {}

  execute(query: GetAiCostSummaryQuery): Promise<AiCostSummary> {
    return this.repository.getCostSummary(query.organizationId);
  }
}
