import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RunDeepRequirementAnalysisCommand } from '../application/commands/run-deep-requirement-analysis.command';
import { GetRequirementAnalysisReportQuery } from '../application/queries/get-requirement-analysis-report.query';
import { GetRequirementAnalysisHistoryQuery } from '../application/queries/get-requirement-analysis-history.query';
import { RequirementAnalysisReportEntity } from '../domain/entities/requirement-analysis-report.entity';
import { RequirementAnalysisReportDto } from './dto/requirement-analysis-report.dto';

function toDto(entity: RequirementAnalysisReportEntity): RequirementAnalysisReportDto {
  return {
    id: entity.id,
    storyId: entity.storyId,
    sprintId: entity.sprintId,
    aiProvider: entity.aiProvider,
    model: entity.model,
    promptVersion: entity.promptVersion,
    version: entity.version,
    isLatest: entity.isLatest,
    generatedBy: entity.generatedBy,
    analysis: entity.analysis,
    testCases: entity.testCases,
    coverage: entity.coverage,
    confidenceScore: entity.confidenceScore,
    createdAt: entity.createdAt.toISOString(),
  };
}

// Deliberately a separate controller from RequirementIntelligenceController (`/requirements`) --
// this is the deeper, Gemini-backed capability, versioned and JSON-blob-shaped rather than the
// normalized Requirement/AcceptanceCriterion rows the other controller manages. Reuses the same
// requirement:read/requirement:write permissions -- same bounded context, no new Permission rows.
@ApiTags('Requirement Intelligence')
@Controller('stories/:storyId/analysis')
export class RequirementAnalysisReportController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('requirement:read')
  async getLatest(
    @Param('storyId') storyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RequirementAnalysisReportDto | null> {
    const report = await this.queryBus.execute<
      GetRequirementAnalysisReportQuery,
      RequirementAnalysisReportEntity | null
    >(new GetRequirementAnalysisReportQuery(storyId, user.organizationId));
    return report ? toDto(report) : null;
  }

  @Get('history')
  @RequirePermission('requirement:read')
  async getHistory(
    @Param('storyId') storyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RequirementAnalysisReportDto[]> {
    const reports = await this.queryBus.execute<
      GetRequirementAnalysisHistoryQuery,
      RequirementAnalysisReportEntity[]
    >(new GetRequirementAnalysisHistoryQuery(storyId, user.organizationId));
    return reports.map(toDto);
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('requirement:write')
  async generate(
    @Param('storyId') storyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RequirementAnalysisReportDto> {
    const report = await this.commandBus.execute<
      RunDeepRequirementAnalysisCommand,
      RequirementAnalysisReportEntity
    >(new RunDeepRequirementAnalysisCommand(user.organizationId, user.userId, storyId));
    return toDto(report);
  }
}
