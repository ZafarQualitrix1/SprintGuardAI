import type { AutomationGeneration } from '@sprintguard/database';
import { AutomationFile, AutomationGenerationEntity } from '../../domain/entities/automation-generation.entity';

export function toAutomationGenerationEntity(row: AutomationGeneration): AutomationGenerationEntity {
  return new AutomationGenerationEntity(
    row.id,
    row.testCaseId,
    row.automationType as 'API' | 'UI',
    row.version,
    row.status,
    row.frameworkVersion,
    row.generatorVersion,
    row.aiModelVersion,
    row.files as unknown as AutomationFile[],
    row.automationReadinessScore,
    row.estimatedEffortHours,
    row.complexityLevel,
    (row.requiredPreconditions as unknown as string[] | null) ?? [],
    (row.missingRequirementDetails as unknown as string[] | null) ?? [],
    row.createdAt,
    row.isOutdated,
  );
}
