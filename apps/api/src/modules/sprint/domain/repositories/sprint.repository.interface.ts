import { SprintEntity, SprintSource, SprintWithStories } from '../entities/sprint.entity';
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
}

export interface CreateSprintWithStoriesInput {
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

export interface ISprintRepository {
  /** Sprint aggregate transaction (Solution Architecture §2): Sprint + all Stories commit atomically. */
  createWithStories(input: CreateSprintWithStoriesInput): Promise<SprintWithStories>;
  findByIdWithStories(id: string, organizationId: string): Promise<SprintWithStories | null>;
  listByProject(projectId: string, organizationId: string): Promise<SprintEntity[]>;
}
