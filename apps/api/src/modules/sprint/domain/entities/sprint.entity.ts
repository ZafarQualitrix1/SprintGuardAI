import { StoryEntity } from './story.entity';

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type SprintSource = 'MANUAL' | 'JIRA' | 'AZURE_DEVOPS' | 'GITHUB' | 'LINEAR';

export class SprintEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly externalId: string | null,
    public readonly name: string,
    public readonly goal: string | null,
    public readonly status: SprintStatus,
    public readonly source: SprintSource,
    public readonly startDate: Date | null,
    public readonly endDate: Date | null,
    public readonly sourceConnectionId: string | null,
    public readonly lastSyncedAt: Date | null,
    public readonly archivedAt: Date | null,
    // Jira deep links (Bug 1: "Attach the Jira link with every user story"). Null unless the
    // caller specifically joined in the source connection's siteUrl (see
    // ISprintRepository.findByIdWithStories) -- most read paths don't need it.
    public readonly jiraSiteUrl: string | null = null,
  ) {}
}

export type SprintSyncAction = 'IMPORT' | 'SYNC' | 'OVERRIDE' | 'RENAME' | 'ARCHIVE' | 'UNARCHIVE' | 'DELETE';
export type SprintSyncStatus = 'SUCCESS' | 'FAILED';

export class SprintSyncEventEntity {
  constructor(
    public readonly id: string,
    public readonly sprintId: string,
    public readonly action: SprintSyncAction,
    public readonly status: SprintSyncStatus,
    public readonly storiesCreated: number,
    public readonly storiesUpdated: number,
    public readonly errorMessage: string | null,
    public readonly triggeredBy: string | null,
    public readonly createdAt: Date,
  ) {}
}

// Read model for the Sprint Analysis page: a Sprint plus the Stories imported into its aggregate
// transaction (Solution Architecture §2 -- "Sprint import transaction persists Sprint + all
// Stories atomically"). Deeper story analysis (Requirement/AcceptanceCriterion extraction) is
// owned by the `requirement-intelligence` module once AI Services (Step 8) lands; this module
// only owns the raw imported Story record.
export class SprintWithStories {
  constructor(
    public readonly sprint: SprintEntity,
    public readonly stories: StoryEntity[],
  ) {}
}
