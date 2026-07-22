import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ComputeReleaseReadinessCommand } from '../application/commands/compute-release-readiness.command';
import { GetLatestReleaseReportQuery } from '../application/queries/get-latest-release-report.query';
import { ReleaseReportEntity } from '../domain/entities/release-report.entity';
import { ReleaseReportDto } from './dto/release-report.dto';

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
}
