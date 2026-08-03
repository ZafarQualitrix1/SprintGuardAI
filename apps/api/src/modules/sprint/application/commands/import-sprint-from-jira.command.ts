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
import { FetchExternalSprintIssuesQuery } from '../../../integration/application/queries/fetch-external-sprint-issues.query';
import { FetchExternalIssueDetailQuery } from '../../../integration/application/queries/fetch-external-issue-detail.query';
import {
  ExternalIssueDetailPayload,
  ExternalIssueSummaryPayload,
  ExternalSprintPayload,
} from '../../../integration/application/ports/integration-connector.port';
import { SmartImportSelection } from '../types/smart-import-selection';

export class ImportSprintFromJiraCommand {
  constructor(
    public readonly organizationId: string,
    public readonly projectId: string,
    public readonly connectionId: string,
    public readonly reference: string,
    public readonly actorId: string,
    /** Smart Sprint Import (§2). Omitted -> import everything with the pre-existing thin fields. */
    public readonly smartImport?: SmartImportSelection,
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

function classifyIssueType(issueType: string): 'epic' | 'subtask' | 'bug' | 'task' | 'story' {
  const normalized = issueType.toLowerCase();
  if (normalized.includes('epic')) return 'epic';
  if (normalized.includes('sub-task') || normalized.includes('subtask')) return 'subtask';
  if (normalized.includes('bug') || normalized.includes('defect')) return 'bug';
  if (normalized === 'task') return 'task';
  // Custom/unrecognized issue types (org-specific workflow schemes) default to "story" so they
  // aren't silently dropped when includeUserStories is checked -- the common default case.
  return 'story';
}

function matchesIssueTypeFilter(issueType: string, selection: SmartImportSelection): boolean {
  switch (classifyIssueType(issueType)) {
    case 'epic':
      return selection.includeEpics;
    case 'subtask':
      return selection.includeSubtasks;
    case 'bug':
      return selection.includeBugs;
    case 'task':
      return selection.includeTasks;
    default:
      return selection.includeUserStories;
  }
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

    const stories: CreateStoryInput[] = command.smartImport
      ? await this.buildSmartImportStories(command, command.smartImport)
      : externalSprint.stories.map((story) => ({
          externalId: story.externalId,
          title: story.title,
          description: story.description,
          storyPoints: story.storyPoints,
          status: mapExternalStatus(story.status),
          priority: story.priority,
          assignee: story.assignee,
        }));

    // Idempotent: re-importing a sprint whose Jira ID already exists updates it in place (and
    // upserts each story by externalId) instead of creating a duplicate -- see
    // ISprintRepository.upsertWithStories for why this never touches AI-generated data.
    const result = await this.sprintRepository.upsertWithStories({
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

    await this.sprintRepository.recordSyncEvent({
      sprintId: result.sprintWithStories.sprint.id,
      organizationId: command.organizationId,
      action: result.wasNewSprint ? 'IMPORT' : 'SYNC',
      status: 'SUCCESS',
      storiesCreated: result.storiesCreated,
      storiesUpdated: result.storiesUpdated,
      triggeredBy: command.actorId,
    });

    this.eventBus.publish(
      new SprintImportedEvent(
        result.sprintWithStories.sprint.id,
        project.id,
        command.organizationId,
        stories.length,
      ),
    );

    return result.sprintWithStories;
  }

  // Smart Sprint Import (§2): resolves the picker's mode/filters against a fresh issue-type-aware
  // listing, then fetches full per-issue detail (labels/components/epic/acceptance criteria/
  // comments/attachments/links -- everything fetchIssueDetail already knows how to pull in one
  // Jira call each) only for the issues that made the cut. Sequential, not parallel: bounds
  // concurrent load on the Jira API, same rationale as every other sequential external-call loop
  // in this codebase (e.g. RunTestGenerationHandler).
  private async buildSmartImportStories(
    command: ImportSprintFromJiraCommand,
    selection: SmartImportSelection,
  ): Promise<CreateStoryInput[]> {
    const summary = await this.queryBus.execute<FetchExternalSprintIssuesQuery, ExternalIssueSummaryPayload[]>(
      new FetchExternalSprintIssuesQuery(command.organizationId, command.connectionId, command.reference),
    );

    const typeFiltered = summary.filter((issue) => matchesIssueTypeFilter(issue.issueType, selection));

    let targeted: ExternalIssueSummaryPayload[];
    switch (selection.mode) {
      case 'SELECTED': {
        const keys = new Set(selection.selectedExternalIds ?? []);
        targeted = typeFiltered.filter((issue) => keys.has(issue.externalId));
        break;
      }
      case 'BY_EPIC':
        targeted = typeFiltered.filter((issue) => issue.epicName === selection.epicName);
        break;
      case 'BY_LABEL':
        targeted = typeFiltered.filter((issue) => issue.labels.includes(selection.label ?? ''));
        break;
      case 'BY_ASSIGNEE':
        targeted = typeFiltered.filter((issue) => issue.assignee === selection.assignee);
        break;
      default:
        targeted = typeFiltered;
    }

    const stories: CreateStoryInput[] = [];
    for (const issue of targeted) {
      const detail = await this.queryBus.execute<FetchExternalIssueDetailQuery, ExternalIssueDetailPayload>(
        new FetchExternalIssueDetailQuery(command.organizationId, command.connectionId, issue.externalId),
      );

      const raw: Record<string, unknown> = {};
      if (selection.includeAcceptanceCriteria && detail.acceptanceCriteria) {
        raw.acceptanceCriteria = detail.acceptanceCriteria;
      }
      if (selection.includeComments && detail.comments.length > 0) raw.comments = detail.comments;
      if (selection.includeAttachments && detail.attachments.length > 0) raw.attachments = detail.attachments;
      if (selection.includeStoryLinks && detail.links.length > 0) raw.links = detail.links;

      const isSubtask = classifyIssueType(detail.issueType) === 'subtask';

      stories.push({
        externalId: detail.externalId,
        title: detail.title,
        description: detail.description,
        storyPoints: selection.includeStoryPoints ? detail.storyPoints : null,
        status: mapExternalStatus(detail.status),
        priority: detail.priority,
        assignee: selection.includeAssignees ? detail.assignee : null,
        issueType: detail.issueType,
        epicKey: detail.epicKey,
        epicName: detail.epic,
        labels: selection.includeLabels ? detail.labels : [],
        components: selection.includeComponents ? detail.components : [],
        raw: Object.keys(raw).length > 0 ? raw : null,
        // Sub-tasks reference their parent issue via `parent` (the parent's summary/key) --
        // fetchIssueDetail doesn't return the parent's key separately from its display name for
        // non-epic parents, so re-derive it from the summary list already fetched above.
        parentExternalId: isSubtask
          ? (summary.find((s) => s.title === detail.parent)?.externalId ?? null)
          : null,
      });
    }

    return stories;
  }
}
