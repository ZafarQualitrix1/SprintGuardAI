export interface AcceptanceCriterion {
  id: string;
  given: string;
  when: string;
  then: string;
}

export interface Requirement {
  id: string;
  text: string;
  type: string;
  confidenceScore: number | null;
  acceptanceCriteria: AcceptanceCriterion[];
}
