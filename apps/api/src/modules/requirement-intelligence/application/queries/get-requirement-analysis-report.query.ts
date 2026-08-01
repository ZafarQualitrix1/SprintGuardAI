import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  REQUIREMENT_ANALYSIS_REPORT_REPOSITORY,
  IRequirementAnalysisReportRepository,
} from '../../domain/repositories/requirement-analysis-report.repository.interface';
import { RequirementAnalysisReportEntity } from '../../domain/entities/requirement-analysis-report.entity';

export class GetRequirementAnalysisReportQuery {
  constructor(
    public readonly storyId: string,
    public readonly organizationId: string,
  ) {}
}

@QueryHandler(GetRequirementAnalysisReportQuery)
export class GetRequirementAnalysisReportHandler
  implements IQueryHandler<GetRequirementAnalysisReportQuery, RequirementAnalysisReportEntity | null>
{
  constructor(
    @Inject(REQUIREMENT_ANALYSIS_REPORT_REPOSITORY)
    private readonly reportRepository: IRequirementAnalysisReportRepository,
  ) {}

  execute(query: GetRequirementAnalysisReportQuery): Promise<RequirementAnalysisReportEntity | null> {
    return this.reportRepository.findLatestByStoryId(query.storyId, query.organizationId);
  }
}
