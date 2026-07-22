export type RequirementType = 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUSINESS_RULE' | 'CONSTRAINT';

export class AcceptanceCriterionEntity {
  constructor(
    public readonly id: string,
    public readonly requirementId: string,
    public readonly given: string,
    public readonly when: string,
    public readonly then: string,
  ) {}
}

export class RequirementEntity {
  constructor(
    public readonly id: string,
    public readonly storyId: string,
    public readonly text: string,
    public readonly type: RequirementType,
    public readonly confidenceScore: number | null,
    public readonly acceptanceCriteria: AcceptanceCriterionEntity[],
  ) {}
}
