import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ComputeCoverageCommand } from '../application/commands/compute-coverage.command';
import { GetCoverageBySprintQuery } from '../application/queries/get-coverage-by-sprint.query';
import { CoverageResultEntity } from '../domain/entities/coverage.entity';
import { CoverageResultDto } from './dto/coverage.dto';

function toDto(entity: CoverageResultEntity): CoverageResultDto {
  return {
    sprintId: entity.sprintId,
    summary: entity.summary,
    entries: entity.entries,
    gaps: entity.gaps,
    aiRecommendation: entity.aiRecommendation,
    computedAt: entity.computedAt ? entity.computedAt.toISOString() : null,
  };
}

@ApiTags('Test Coverage')
@Controller('sprints/:sprintId/coverage')
export class CoverageController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('coverage:read')
  async get(@Param('sprintId') sprintId: string): Promise<CoverageResultDto | null> {
    const result = await this.queryBus.execute<GetCoverageBySprintQuery, CoverageResultEntity | null>(
      new GetCoverageBySprintQuery(sprintId),
    );
    return result ? toDto(result) : null;
  }

  @Post('compute')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('coverage:write')
  async compute(
    @Param('sprintId') sprintId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CoverageResultDto> {
    const result = await this.commandBus.execute<ComputeCoverageCommand, CoverageResultEntity>(
      new ComputeCoverageCommand(user.organizationId, sprintId),
    );
    return toDto(result);
  }
}
