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

// "Override Existing Sprint" -- the explicit, user-confirmed destructive refresh: deletes every
// Story for the sprint (cascading away all AI-generated data: Requirement/TestScenario/TestCase/
// CoverageMatrixEntry/Execution/Defect/RequirementAnalysisReport) and recreates fresh from the
// latest Jira payload. Only reachable from a confirmation dialog on the frontend -- never called
// as part of a normal sync/import.
export class OverrideSprintCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly sprintId: string,
  ) {}
}

@CommandHandler(OverrideSprintCommand)
export class OverrideSprintHandler implements ICommandHandler<OverrideSprintCommand, SprintWithStories> {
  constructor(
    @Inject(SPRINT_REPOSITORY) private readonly sprintRepository: ISprintRepository,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: OverrideSprintCommand): Promise<SprintWithStories> {
    const existing = await this.sprintRepository.findByIdWithStories(command.sprintId, command.organizationId);
    if (!existing) {
      throw new NotFoundException('Sprint not found');
    }
    if (!existing.sprint.sourceConnectionId || !existing.sprint.externalId) {
      throw new BadRequestException('This sprint has no live Jira connection to refresh from.');
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

      const result = await this.sprintRepository.overrideWithStories(command.sprintId, {
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
        action: 'OVERRIDE',
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
        action: 'OVERRIDE',
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Override failed',
        triggeredBy: command.actorId,
      });
      throw error;
    }
  }
}
