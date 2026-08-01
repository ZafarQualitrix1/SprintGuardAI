import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  REQUIREMENT_ANALYSIS_REPORT_REPOSITORY,
  IRequirementAnalysisReportRepository,
} from '../../domain/repositories/requirement-analysis-report.repository.interface';
import { RequirementAnalysisReportEntity } from '../../domain/entities/requirement-analysis-report.entity';

export class GetRequirementAnalysisHistoryQuery {
  constructor(
    public readonly storyId: string,
    public readonly organizationId: string,
  ) {}
}

@QueryHandler(GetRequirementAnalysisHistoryQuery)
export class GetRequirementAnalysisHistoryHandler
  implements IQueryHandler<GetRequirementAnalysisHistoryQuery, RequirementAnalysisReportEntity[]>
{
  constructor(
    @Inject(REQUIREMENT_ANALYSIS_REPORT_REPOSITORY)
    private readonly reportRepository: IRequirementAnalysisReportRepository,
  ) {}

  execute(query: GetRequirementAnalysisHistoryQuery): Promise<RequirementAnalysisReportEntity[]> {
    return this.reportRepository.findHistoryByStoryId(query.storyId, query.organizationId);
  }
}
