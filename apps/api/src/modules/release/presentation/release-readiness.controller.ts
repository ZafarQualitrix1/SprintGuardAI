import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ComputeReleaseReadinessCommand } from '../application/commands/compute-release-readiness.command';
import { UpdateReleaseScoringConfigCommand } from '../application/commands/update-release-scoring-config.command';
import { UpdateSprintReleaseGatesCommand } from '../application/commands/update-sprint-release-gates.command';
import { GetLatestReleaseReportQuery } from '../application/queries/get-latest-release-report.query';
import { GetReleaseScoringConfigQuery } from '../application/queries/get-release-scoring-config.query';
import { GetSprintReleaseGatesQuery } from '../application/queries/get-sprint-release-gates.query';
import { ReleaseReportEntity } from '../domain/entities/release-report.entity';
import { ReleaseScoringConfigEntity } from '../domain/entities/release-scoring-config.entity';
import { SprintGates } from '../domain/repositories/release-metrics-read.repository.interface';
import { ReleaseReportDto } from './dto/release-report.dto';
import {
  ReleaseScoringConfigDto,
  SprintReleaseGatesDto,
  UpdateReleaseScoringConfigDto,
  UpdateSprintReleaseGatesDto,
} from './dto/release-scoring-config.dto';

function toDto(entity: ReleaseReportEntity): ReleaseReportDto {
  return {
    id: entity.id,
    sprintId: entity.sprintId,
    readinessScore: entity.readinessScore,
    executiveSummary: entity.executiveSummary,
    breakdown: entity.breakdown,
    status: entity.status,
    createdAt: entity.createdAt.toISOString(),
  };
}

function toScoringConfigDto(entity: ReleaseScoringConfigEntity & { isCustomized: boolean }): ReleaseScoringConfigDto {
  return {
    projectId: entity.projectId,
    requirementCoverageWeight: entity.requirementCoverageWeight,
    testCaseCoverageWeight: entity.testCaseCoverageWeight,
    manualExecutionWeight: entity.manualExecutionWeight,
    automationExecutionWeight: entity.automationExecutionWeight,
    bugRiskWeight: entity.bugRiskWeight,
    severityDeductions: entity.severityDeductions,
    manualPassRateBlockThreshold: entity.manualPassRateBlockThreshold,
    automationCoverageWarnThreshold: entity.automationCoverageWarnThreshold,
    isCustomized: entity.isCustomized,
  };
}

function toGatesDto(gates: SprintGates): SprintReleaseGatesDto {
  return { regressionCompleted: gates.regressionCompleted, deploymentChecklistComplete: gates.deploymentChecklistComplete };
}

@ApiTags('Release Readiness')
@Controller('sprints/:sprintId/release-readiness')
export class ReleaseReadinessController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('release:read')
  async get(@Param('sprintId') sprintId: string): Promise<ReleaseReportDto | null> {
    const report = await this.queryBus.execute<GetLatestReleaseReportQuery, ReleaseReportEntity | null>(
      new GetLatestReleaseReportQuery(sprintId),
    );
    return report ? toDto(report) : null;
  }

  @Post('compute')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('release:publish')
  async compute(
    @Param('sprintId') sprintId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReleaseReportDto> {
    const report = await this.commandBus.execute<ComputeReleaseReadinessCommand, ReleaseReportEntity>(
      new ComputeReleaseReadinessCommand(user.organizationId, sprintId),
    );
    return toDto(report);
  }

  // Scoring config is stored per-project, but this route stays sprint-scoped to match how the
  // Release Readiness page is already routed -- the handler resolves the owning project internally.
  @Get('scoring-config')
  @RequirePermission('release:read')
  async getScoringConfig(
    @Param('sprintId') sprintId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReleaseScoringConfigDto> {
    const config = await this.queryBus.execute(new GetReleaseScoringConfigQuery(user.organizationId, sprintId));
    return toScoringConfigDto(config);
  }

  @Put('scoring-config')
  @RequirePermission('release:configure')
  async updateScoringConfig(
    @Param('sprintId') sprintId: string,
    @Body() body: UpdateReleaseScoringConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReleaseScoringConfigDto> {
    const config = await this.commandBus.execute<UpdateReleaseScoringConfigCommand, ReleaseScoringConfigEntity>(
      new UpdateReleaseScoringConfigCommand(user.organizationId, sprintId, body),
    );
    return toScoringConfigDto({ ...config, isCustomized: true });
  }

  @Get('gates')
  @RequirePermission('release:read')
  async getGates(
    @Param('sprintId') sprintId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SprintReleaseGatesDto> {
    const gates = await this.queryBus.execute<GetSprintReleaseGatesQuery, SprintGates>(
      new GetSprintReleaseGatesQuery(user.organizationId, sprintId),
    );
    return toGatesDto(gates);
  }

  @Patch('gates')
  @RequirePermission('release:publish')
  async updateGates(
    @Param('sprintId') sprintId: string,
    @Body() body: UpdateSprintReleaseGatesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SprintReleaseGatesDto> {
    const gates = await this.commandBus.execute<UpdateSprintReleaseGatesCommand, SprintGates>(
      new UpdateSprintReleaseGatesCommand(user.organizationId, sprintId, body),
    );
    return toGatesDto(gates);
  }
}
