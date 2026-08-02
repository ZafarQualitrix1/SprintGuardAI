export type AutomationType = 'API' | 'UI';
export type AutomationGenerationStatus = 'GENERATED' | 'SAVED' | 'COMMITTED';

export interface AutomationFile {
  path: string;
  content: string;
}

export class AutomationGenerationEntity {
  constructor(
    public readonly id: string,
    public readonly testCaseId: string,
    public readonly automationType: AutomationType,
    public readonly version: number,
    public readonly status: AutomationGenerationStatus,
    public readonly frameworkVersion: string,
    public readonly generatorVersion: string,
    public readonly aiModelVersion: string,
    public readonly files: AutomationFile[],
    public readonly automationReadinessScore: number | null,
    public readonly estimatedEffortHours: number | null,
    public readonly complexityLevel: string | null,
    public readonly requiredPreconditions: string[],
    public readonly missingRequirementDetails: string[],
    public readonly createdAt: Date,
  ) {}
}
