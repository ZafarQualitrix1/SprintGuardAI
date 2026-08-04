import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  RELEASE_REPORT_REPOSITORY,
  IReleaseReportRepository,
} from '../../domain/repositories/release-report.repository.interface';
import { ReleaseReportEntity } from '../../domain/entities/release-report.entity';

const MAX_HISTORY_LIMIT = 50;

export class GetReleaseReportHistoryQuery {
  constructor(
    public readonly sprintId: string,
    public readonly limit: number = 20,
  ) {}
}

@QueryHandler(GetReleaseReportHistoryQuery)
export class GetReleaseReportHistoryHandler
  implements IQueryHandler<GetReleaseReportHistoryQuery, ReleaseReportEntity[]>
{
  constructor(
    @Inject(RELEASE_REPORT_REPOSITORY) private readonly releaseReportRepository: IReleaseReportRepository,
  ) {}

  execute(query: GetReleaseReportHistoryQuery): Promise<ReleaseReportEntity[]> {
    const limit = Math.min(Math.max(1, query.limit), MAX_HISTORY_LIMIT);
    return this.releaseReportRepository.findHistoryBySprintId(query.sprintId, limit);
  }
}
