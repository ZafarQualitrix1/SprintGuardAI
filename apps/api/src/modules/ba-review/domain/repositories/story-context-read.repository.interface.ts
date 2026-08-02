export const STORY_CONTEXT_READ_REPOSITORY = Symbol('IStoryContextReadRepository');

export interface StoryContextReadModel {
  id: string;
  title: string;
  description: string | null;
  externalId: string | null;
  sprintId: string;
  sprintName: string;
  sourceConnectionId: string | null;
  assignedBaEmail: string | null;
  assignedBaJiraAccountId: string | null;
  assignedBaAccountResolvedAt: Date | null;
}

// Lightweight local read port, same pragmatic choice requirement-intelligence's IStoryReadRepository
// already made -- ba-review only ever reads a Story to build the Jira comment/document context, it
// never writes to the Story table's core fields (only the BA-assignment columns it owns).
export interface IStoryContextReadRepository {
  findById(storyId: string, organizationId: string): Promise<StoryContextReadModel | null>;
}
