import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import {
  PROJECT_REPOSITORY,
  IProjectRepository,
} from '../../domain/repositories/project.repository.interface';
import {
  SPRINT_REPOSITORY,
  ISprintRepository,
  CreateStoryInput,
} from '../../domain/repositories/sprint.repository.interface';
import { SprintWithStories } from '../../domain/entities/sprint.entity';
import { StoryStatus } from '../../domain/entities/story.entity';
import { SprintImportedEvent } from '../../domain/events/sprint-imported.event';
import { FetchExternalSprintQuery } from '../../../integration/application/queries/fetch-external-sprint.query';
import { ExternalSprintPayload } from '../../../integration/application/ports/integration-connector.port';

export class ImportSprintFromJiraCommand {
  constructor(
    public readonly organizationId: string,
    public readonly projectId: string,
    public readonly connectionId: string,
    public readonly reference: string,
  ) {}
}

// Best-effort mapping from Jira's free-form workflow status names into our closed StoryStatus
// enum -- every Jira instance customizes workflow names, so this is deliberately a heuristic, not
// an exhaustive lookup table.
export function mapExternalStatus(status: string): StoryStatus {
  const normalized = status.toLowerCase();
  if (normalized.includes('done') || normalized.includes('closed') || normalized.includes('resolved')) {
    return 'DONE';
  }
  if (normalized.includes('block')) {
    return 'BLOCKED';
  }
  if (normalized.includes('review') || normalized.includes('qa')) {
    return 'IN_REVIEW';
  }
  if (normalized.includes('progress') || normalized.includes('doing')) {
    return 'IN_PROGRESS';
  }
  return 'BACKLOG';
}

@CommandHandler(ImportSprintFromJiraCommand)
export class ImportSprintFromJiraHandler
  implements ICommandHandler<ImportSprintFromJiraCommand, SprintWithStories>
{
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projectRepository: IProjectRepository,
    @Inject(SPRINT_REPOSITORY) private readonly sprintRepository: ISprintRepository,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ImportSprintFromJiraCommand): Promise<SprintWithStories> {
    const project = await this.projectRepository.findById(command.projectId, command.organizationId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const externalSprint = await this.queryBus.execute<FetchExternalSprintQuery, ExternalSprintPayload>(
      new FetchExternalSprintQuery(command.organizationId, command.connectionId, command.reference),
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

    const result = await this.sprintRepository.createWithStories({
      projectId: project.id,
      externalId: externalSprint.externalId,
      name: externalSprint.name,
      goal: externalSprint.goal,
      source: 'JIRA',
      startDate: externalSprint.startDate,
      endDate: externalSprint.endDate,
      stories,
      sourceConnectionId: command.connectionId,
    });

    this.eventBus.publish(
      new SprintImportedEvent(result.sprint.id, project.id, command.organizationId, stories.length),
    );

    return result;
  }
}
