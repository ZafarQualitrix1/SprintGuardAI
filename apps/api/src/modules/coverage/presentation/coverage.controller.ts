import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ComputeCoverageCommand } from '../application/commands/compute-coverage.command';
import { ComputeStoryCoverageCommand } from '../application/commands/compute-story-coverage.command';
import { GetCoverageBySprintQuery } from '../application/queries/get-coverage-by-sprint.query';
import { GetStoryCoverageQuery } from '../application/queries/get-story-coverage.query';
import { CoverageResultEntity, StoryCoverageResultEntity } from '../domain/entities/coverage.entity';
import { CoverageResultDto, StoryCoverageResultDto } from './dto/coverage.dto';

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

function toStoryDto(entity: StoryCoverageResultEntity): StoryCoverageResultDto {
  return {
    storyId: entity.storyId,
    storyTitle: entity.storyTitle,
    summary: entity.summary,
    dimensions: entity.dimensions,
    entries: entity.entries,
    gaps: entity.gaps,
    missingTestScenarios: entity.missingTestScenarios,
    missingEdgeCases: entity.missingEdgeCases,
    traceabilityMatrix: entity.traceabilityMatrix,
    aiRecommendation: entity.aiRecommendation,
    computedAt: entity.computedAt.toISOString(),
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

// Story-scoped coverage (Sprint Analysis Integration, §3): "The Coverage page must analyze the
// selected User Story only." Separate controller (not a route on CoverageController above) since
// it's keyed by :storyId, not :sprintId.
@ApiTags('Test Coverage')
@Controller('stories/:storyId/coverage')
export class StoryCoverageController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('coverage:read')
  async get(
    @Param('storyId') storyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StoryCoverageResultDto> {
    const result = await this.queryBus.execute<GetStoryCoverageQuery, StoryCoverageResultEntity>(
      new GetStoryCoverageQuery(user.organizationId, storyId),
    );
    return toStoryDto(result);
  }

  @Post('compute')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('coverage:write')
  async compute(
    @Param('storyId') storyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StoryCoverageResultDto> {
    const result = await this.commandBus.execute<ComputeStoryCoverageCommand, StoryCoverageResultEntity>(
      new ComputeStoryCoverageCommand(user.organizationId, storyId),
    );
    return toStoryDto(result);
  }
}
