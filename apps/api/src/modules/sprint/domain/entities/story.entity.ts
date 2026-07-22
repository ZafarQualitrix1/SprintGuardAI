export type StoryStatus = 'BACKLOG' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';

export class StoryEntity {
  constructor(
    public readonly id: string,
    public readonly sprintId: string,
    public readonly externalId: string | null,
    public readonly title: string,
    public readonly description: string | null,
    public readonly storyPoints: number | null,
    public readonly status: StoryStatus,
    public readonly priority: string | null,
    public readonly assignee: string | null,
  ) {}
}
