export const STORY_METADATA_READ_REPOSITORY = Symbol('IStoryMetadataReadRepository');

export interface StoryMetadataReadModel {
  id: string;
  title: string;
  externalId: string | null;
}

// Read-only access to Story metadata owned by the `sprint` module -- same pragmatic local-read-port
// pattern as this module's own IAcceptanceCriterionReadRepository into `requirement-intelligence`.
// Narrow on purpose: the export service only needs title/externalId for the workbook header and
// filename, not the full Story aggregate.
export interface IStoryMetadataReadRepository {
  findById(storyId: string, organizationId: string): Promise<StoryMetadataReadModel | null>;
}
