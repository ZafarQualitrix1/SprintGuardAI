import { RequirementEntity, RequirementType } from '../entities/requirement.entity';

export const REQUIREMENT_REPOSITORY = Symbol('IRequirementRepository');

export interface CreateAcceptanceCriterionInput {
  given: string;
  when: string;
  then: string;
}

export interface CreateRequirementInput {
  text: string;
  type: RequirementType;
  confidenceScore: number;
  acceptanceCriteria: CreateAcceptanceCriterionInput[];
}

export interface IRequirementRepository {
  /**
   * Re-extraction replaces the story's requirement set rather than merging (Solution
   * Architecture §2 Aggregate Root Documentation: "AC set is fully replaced, not merged, on
   * re-analysis, versioned via AgentRun history, not in-place mutation").
   */
  replaceForStory(storyId: string, requirements: CreateRequirementInput[]): Promise<RequirementEntity[]>;
  findByStoryId(storyId: string): Promise<RequirementEntity[]>;
}
