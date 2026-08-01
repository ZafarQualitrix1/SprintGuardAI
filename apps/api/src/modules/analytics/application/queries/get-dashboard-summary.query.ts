import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ANALYTICS_READ_REPOSITORY,
  DashboardSummaryResult,
  IAnalyticsReadRepository,
} from '../../domain/repositories/analytics-read.repository.interface';

export class GetDashboardSummaryQuery {
  constructor(public readonly organizationId: string) {}
}

@QueryHandler(GetDashboardSummaryQuery)
export class GetDashboardSummaryHandler implements IQueryHandler<GetDashboardSummaryQuery, DashboardSummaryResult> {
  constructor(
    @Inject(ANALYTICS_READ_REPOSITORY) private readonly analyticsReadRepository: IAnalyticsReadRepository,
  ) {}

  execute(query: GetDashboardSummaryQuery): Promise<DashboardSummaryResult> {
    return this.analyticsReadRepository.getDashboardSummary(query.organizationId);
  }
}
