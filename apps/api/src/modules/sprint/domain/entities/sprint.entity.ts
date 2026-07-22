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
