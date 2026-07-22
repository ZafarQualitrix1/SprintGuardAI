export const ACCEPTANCE_CRITERION_READ_REPOSITORY = Symbol('IAcceptanceCriterionReadRepository');

export interface AcceptanceCriterionReadModel {
  id: string;
  storyId: string;
  storyTitle: string;
  given: string;
  when: string;
  then: string;
}

// Read-only access to Acceptance Criteria owned by the `requirement-intelligence` module -- same
// pragmatic local-read-port pattern as that module's own IStoryReadRepository into `sprint`.
export interface IAcceptanceCriterionReadRepository {
  findByStoryId(storyId: string, organizationId: string): Promise<AcceptanceCriterionReadModel[]>;
}
