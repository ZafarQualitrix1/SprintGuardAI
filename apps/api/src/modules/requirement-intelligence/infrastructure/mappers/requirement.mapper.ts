import type { AcceptanceCriterion, Requirement } from '@sprintguard/database';
import { AcceptanceCriterionEntity, RequirementEntity } from '../../domain/entities/requirement.entity';

type RequirementWithAcs = Requirement & { acceptanceCriteria: AcceptanceCriterion[] };

export function toAcceptanceCriterionEntity(row: AcceptanceCriterion): AcceptanceCriterionEntity {
  return new AcceptanceCriterionEntity(row.id, row.requirementId, row.given, row.when, row.then);
}

export function toRequirementEntity(row: RequirementWithAcs): RequirementEntity {
  return new RequirementEntity(
    row.id,
    row.storyId,
    row.text,
    row.type,
    row.confidenceScore,
    row.acceptanceCriteria.map(toAcceptanceCriterionEntity),
  );
}
