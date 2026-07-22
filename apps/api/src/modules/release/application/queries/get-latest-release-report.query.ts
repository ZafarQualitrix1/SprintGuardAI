import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  RELEASE_REPORT_REPOSITORY,
  IReleaseReportRepository,
} from '../../domain/repositories/release-report.repository.interface';
import { ReleaseReportEntity } from '../../domain/entities/release-report.entity';

export class GetLatestReleaseReportQuery {
  constructor(public readonly sprintId: string) {}
}

@QueryHandler(GetLatestReleaseReportQuery)
export class GetLatestReleaseReportHandler
  implements IQueryHandler<GetLatestReleaseReportQuery, ReleaseReportEntity | null>
{
  constructor(
    @Inject(RELEASE_REPORT_REPOSITORY) private readonly releaseReportRepository: IReleaseReportRepository,
  ) {}

  execute(query: GetLatestReleaseReportQuery): Promise<ReleaseReportEntity | null> {
    return this.releaseReportRepository.findLatestBySprintId(query.sprintId);
  }
}
