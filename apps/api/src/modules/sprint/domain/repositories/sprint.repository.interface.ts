import {
  SprintEntity,
  SprintSource,
  SprintSyncAction,
  SprintSyncEventEntity,
  SprintSyncStatus,
  SprintWithStories,
} from '../entities/sprint.entity';
import { StoryStatus } from '../entities/story.entity';

export const SPRINT_REPOSITORY = Symbol('ISprintRepository');

export interface CreateStoryInput {
  externalId: string | null;
  title: string;
  description: string | null;
  storyPoints: number | null;
  status: StoryStatus;
  priority: string | null;
  assignee: string | null;
  // Smart Sprint Import (§2) enrichment -- all optional so manual/thin story creation call sites
  // (fetchSprint's default fields-only path) keep working unchanged.
  issueType?: string;
  epicKey?: string | null;
  epicName?: string | null;
  labels?: string[];
  components?: string[];
  raw?: Record<string, unknown> | null;
  /** Sub-task's parent issue key -- resolved to a DB parentStoryId after all stories in the batch
   * are upserted, since the parent may be created in the very same import. */
  parentExternalId?: string | null;
}

export interface UpsertSprintWithStoriesInput {
  projectId: string;
  externalId: string | null;
  name: string;
  goal: string | null;
  source: SprintSource;
  startDate: Date | null;
  endDate: Date | null;
  stories: CreateStoryInput[];
  /** Jira (or other connector) connection this sprint was imported through, if any. */
  sourceConnectionId?: string | null;
}

export interface SprintSyncResult {
  sprintWithStories: SprintWithStories;
  storiesCreated: number;
  storiesUpdated: number;
  wasNewSprint: boolean;
}

export interface RecordSyncEventInput {
  sprintId: string;
  organizationId: string;
  action: SprintSyncAction;
  status: SprintSyncStatus;
  storiesCreated?: number;
  storiesUpdated?: number;
  errorMessage?: string | null;
  triggeredBy?: string | null;
}

export interface ISprintRepository {
  /** First-time import OR idempotent re-sync: finds an existing sprint by (projectId, externalId)
   * and updates it, upserting its stories by (sprintId, externalId), rather than creating a
   * duplicate Sprint/Story every time the same Jira sprint is imported again. Never deletes a
   * Story row, so every AI-generated child (Requirement/TestScenario/TestCase/
   * CoverageMatrixEntry/Execution/Defect/RequirementAnalysisReport -- all cascade from Story) is
   * preserved automatically; only the Jira-sourced fields on existing rows are overwritten. */
  upsertWithStories(input: UpsertSprintWithStoriesInput): Promise<SprintSyncResult>;

  /** Explicit full refresh ("Override Existing Sprint"): deletes every Story for the sprint --
   * cascading away all AI-generated data with it -- then recreates fresh from the latest Jira
   * payload. Only reachable via a user-confirmed destructive action, never from a normal sync. */
  overrideWithStories(sprintId: string, input: UpsertSprintWithStoriesInput): Promise<SprintSyncResult>;

  findByIdWithStories(id: string, organizationId: string): Promise<SprintWithStories | null>;
  /** Excludes soft-deleted and archived sprints -- matches the sprint list/card view. */
  listByProject(projectId: string, organizationId: string): Promise<SprintEntity[]>;

  rename(id: string, organizationId: string, name: string): Promise<SprintEntity>;
  setArchived(id: string, organizationId: string, archived: boolean): Promise<SprintEntity>;
  softDelete(id: string, organizationId: string): Promise<void>;

  recordSyncEvent(input: RecordSyncEventInput): Promise<void>;
  listSyncEvents(sprintId: string, organizationId: string): Promise<SprintSyncEventEntity[]>;
}
