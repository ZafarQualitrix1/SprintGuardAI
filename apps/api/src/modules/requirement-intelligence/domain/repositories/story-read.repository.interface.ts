export const STORY_READ_REPOSITORY = Symbol('IStoryReadRepository');

export interface StoryReadModel {
  id: string;
  title: string;
  description: string | null;
  externalId: string | null;
  sprintId: string;
  sourceConnectionId: string | null;
}

// Read-only access to the Story record owned by the `sprint` module's Sprint aggregate
// (Solution Architecture §2). Requirement Intelligence only ever reads a Story to derive
// Requirements/ACs from it -- it never writes to the Story table, so a lightweight local read
// port (rather than a cross-module command/query round-trip) is the pragmatic choice here.
export interface IStoryReadRepository {
  findById(storyId: string, organizationId: string): Promise<StoryReadModel | null>;
}
