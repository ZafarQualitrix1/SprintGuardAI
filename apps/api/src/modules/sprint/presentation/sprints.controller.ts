import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ImportSprintFromJiraCommand } from '../application/commands/import-sprint-from-jira.command';
import { ListSprintsQuery } from '../application/queries/list-sprints.query';
import { GetSprintQuery } from '../application/queries/get-sprint.query';
import { SprintEntity, SprintWithStories } from '../domain/entities/sprint.entity';
import { StoryEntity } from '../domain/entities/story.entity';
import { SprintDetailDto, SprintDto, StoryDto } from './dto/sprint.dto';
import { ImportJiraSprintDto } from './dto/import-jira-sprint.dto';

function toSprintDto(entity: SprintEntity): SprintDto {
  return {
    id: entity.id,
    projectId: entity.projectId,
    externalId: entity.externalId,
    name: entity.name,
    goal: entity.goal,
    status: entity.status,
    source: entity.source,
    startDate: entity.startDate?.toISOString() ?? null,
    endDate: entity.endDate?.toISOString() ?? null,
  };
}

function toStoryDto(entity: StoryEntity): StoryDto {
  return {
    id: entity.id,
    externalId: entity.externalId,
    title: entity.title,
    description: entity.description,
    storyPoints: entity.storyPoints,
    status: entity.status,
    priority: entity.priority,
    assignee: entity.assignee,
  };
}

function toSprintDetailDto(result: SprintWithStories): SprintDetailDto {
  return { ...toSprintDto(result.sprint), stories: result.stories.map(toStoryDto) };
}

@ApiTags('Sprints')
@Controller('sprints')
export class SprintsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('sprint:read')
  async list(
    @Query('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SprintDto[]> {
    const sprints = await this.queryBus.execute<ListSprintsQuery, SprintEntity[]>(
      new ListSprintsQuery(user.organizationId, projectId),
    );
    return sprints.map(toSprintDto);
  }

  @Get(':id')
  @RequirePermission('sprint:read')
  async get(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SprintDetailDto> {
    const result = await this.queryBus.execute<GetSprintQuery, SprintWithStories>(
      new GetSprintQuery(user.organizationId, id),
    );
    return toSprintDetailDto(result);
  }

  @Post('import/jira')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('sprint:write')
  async importFromJira(
    @Body() dto: ImportJiraSprintDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SprintDetailDto> {
    const result = await this.commandBus.execute<ImportSprintFromJiraCommand, SprintWithStories>(
      new ImportSprintFromJiraCommand(user.organizationId, dto.projectId, dto.connectionId, dto.reference),
    );
    return toSprintDetailDto(result);
  }
}
