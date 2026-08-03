import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ImportSprintFromJiraCommand } from '../application/commands/import-sprint-from-jira.command';
import { SyncSprintCommand } from '../application/commands/sync-sprint.command';
import { OverrideSprintCommand } from '../application/commands/override-sprint.command';
import { RenameSprintCommand } from '../application/commands/rename-sprint.command';
import { ArchiveSprintCommand } from '../application/commands/archive-sprint.command';
import { DeleteSprintCommand } from '../application/commands/delete-sprint.command';
import { ListSprintsQuery } from '../application/queries/list-sprints.query';
import { GetSprintQuery } from '../application/queries/get-sprint.query';
import { GetSprintSyncHistoryQuery } from '../application/queries/get-sprint-sync-history.query';
import { SprintEntity, SprintSyncEventEntity, SprintWithStories } from '../domain/entities/sprint.entity';
import { StoryEntity } from '../domain/entities/story.entity';
import { SprintDetailDto, SprintDto, SprintSyncEventDto, StoryDto } from './dto/sprint.dto';
import { ImportJiraSprintDto } from './dto/import-jira-sprint.dto';
import { RenameSprintDto } from './dto/rename-sprint.dto';
import { ArchiveSprintDto } from './dto/archive-sprint.dto';

export function toSprintDto(entity: SprintEntity): SprintDto {
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
    canSync: entity.sourceConnectionId !== null,
    lastSyncedAt: entity.lastSyncedAt?.toISOString() ?? null,
    archivedAt: entity.archivedAt?.toISOString() ?? null,
    jiraSiteUrl: entity.jiraSiteUrl,
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

function toSyncEventDto(entity: SprintSyncEventEntity): SprintSyncEventDto {
  return {
    id: entity.id,
    action: entity.action,
    status: entity.status,
    storiesCreated: entity.storiesCreated,
    storiesUpdated: entity.storiesUpdated,
    errorMessage: entity.errorMessage,
    triggeredBy: entity.triggeredBy,
    createdAt: entity.createdAt.toISOString(),
  };
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

  @Get(':id/sync-history')
  @RequirePermission('sprint:read')
  async syncHistory(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SprintSyncEventDto[]> {
    const events = await this.queryBus.execute<GetSprintSyncHistoryQuery, SprintSyncEventEntity[]>(
      new GetSprintSyncHistoryQuery(user.organizationId, id),
    );
    return events.map(toSyncEventDto);
  }

  @Post('import/jira')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('sprint:write')
  async importFromJira(
    @Body() dto: ImportJiraSprintDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SprintDetailDto> {
    const result = await this.commandBus.execute<ImportSprintFromJiraCommand, SprintWithStories>(
      new ImportSprintFromJiraCommand(
        user.organizationId,
        dto.projectId,
        dto.connectionId,
        dto.reference,
        user.userId,
        dto.smartImport,
      ),
    );
    return toSprintDetailDto(result);
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('sprint:write')
  async sync(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SprintDetailDto> {
    const result = await this.commandBus.execute<SyncSprintCommand, SprintWithStories>(
      new SyncSprintCommand(user.organizationId, user.userId, id),
    );
    return toSprintDetailDto(result);
  }

  @Post(':id/override')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('sprint:write')
  async override(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SprintDetailDto> {
    const result = await this.commandBus.execute<OverrideSprintCommand, SprintWithStories>(
      new OverrideSprintCommand(user.organizationId, user.userId, id),
    );
    return toSprintDetailDto(result);
  }

  @Patch(':id')
  @RequirePermission('sprint:write')
  async rename(
    @Param('id') id: string,
    @Body() dto: RenameSprintDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SprintDto> {
    const sprint = await this.commandBus.execute<RenameSprintCommand, SprintEntity>(
      new RenameSprintCommand(user.organizationId, user.userId, id, dto.name),
    );
    return toSprintDto(sprint);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('sprint:write')
  async archive(
    @Param('id') id: string,
    @Body() dto: ArchiveSprintDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SprintDto> {
    const sprint = await this.commandBus.execute<ArchiveSprintCommand, SprintEntity>(
      new ArchiveSprintCommand(user.organizationId, user.userId, id, dto.archived),
    );
    return toSprintDto(sprint);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('sprint:write')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.commandBus.execute<DeleteSprintCommand, void>(
      new DeleteSprintCommand(user.organizationId, user.userId, id),
    );
  }
}
