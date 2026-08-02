import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import {
  SPRINT_REPOSITORY,
  ISprintRepository,
  CreateStoryInput,
} from '../../domain/repositories/sprint.repository.interface';
import { SprintWithStories } from '../../domain/entities/sprint.entity';
import { FetchExternalSprintQuery } from '../../../integration/application/queries/fetch-external-sprint.query';
import { ExternalSprintPayload } from '../../../integration/application/ports/integration-connector.port';
import { mapExternalStatus } from './import-sprint-from-jira.command';

// "Refresh Sprint" / "Sync Latest Data from Jira" -- re-resolves the sprint's own stored
// sourceConnectionId + externalId (set at import time) and re-fetches from Jira, then upserts
// exactly like a re-import (see ISprintRepository.upsertWithStories): existing stories are
// updated in place, new ones are added, nothing is deleted, so all AI-generated data survives.
export class SyncSprintCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly sprintId: string,
  ) {}
}

@CommandHandler(SyncSprintCommand)
export class SyncSprintHandler implements ICommandHandler<SyncSprintCommand, SprintWithStories> {
  constructor(
    @Inject(SPRINT_REPOSITORY) private readonly sprintRepository: ISprintRepository,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: SyncSprintCommand): Promise<SprintWithStories> {
    const existing = await this.sprintRepository.findByIdWithStories(command.sprintId, command.organizationId);
    if (!existing) {
      throw new NotFoundException('Sprint not found');
    }
    if (!existing.sprint.sourceConnectionId || !existing.sprint.externalId) {
      throw new BadRequestException('This sprint has no live Jira connection to sync from.');
    }

    try {
      const externalSprint = await this.queryBus.execute<FetchExternalSprintQuery, ExternalSprintPayload>(
        new FetchExternalSprintQuery(command.organizationId, existing.sprint.sourceConnectionId, existing.sprint.externalId),
      );

      const stories: CreateStoryInput[] = externalSprint.stories.map((story) => ({
        externalId: story.externalId,
        title: story.title,
        description: story.description,
        storyPoints: story.storyPoints,
        status: mapExternalStatus(story.status),
        priority: story.priority,
        assignee: story.assignee,
      }));

      const result = await this.sprintRepository.upsertWithStories({
        projectId: existing.sprint.projectId,
        externalId: externalSprint.externalId,
        name: externalSprint.name,
        goal: externalSprint.goal,
        source: 'JIRA',
        startDate: externalSprint.startDate,
        endDate: externalSprint.endDate,
        stories,
        sourceConnectionId: existing.sprint.sourceConnectionId,
      });

      await this.sprintRepository.recordSyncEvent({
        sprintId: command.sprintId,
        organizationId: command.organizationId,
        action: 'SYNC',
        status: 'SUCCESS',
        storiesCreated: result.storiesCreated,
        storiesUpdated: result.storiesUpdated,
        triggeredBy: command.actorId,
      });

      return result.sprintWithStories;
    } catch (error) {
      await this.sprintRepository.recordSyncEvent({
        sprintId: command.sprintId,
        organizationId: command.organizationId,
        action: 'SYNC',
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Sync failed',
        triggeredBy: command.actorId,
      });
      throw error;
    }
  }
}
