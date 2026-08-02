import { AutomationFile, AutomationGenerationEntity, AutomationType } from '../entities/automation-generation.entity';

export const AUTOMATION_GENERATION_REPOSITORY = Symbol('IAutomationGenerationRepository');

export interface CreateAutomationGenerationInput {
  testCaseId: string;
  automationType: AutomationType;
  frameworkVersion: string;
  generatorVersion: string;
  aiModelVersion: string;
  files: AutomationFile[];
  automationReadinessScore: number | null;
  estimatedEffortHours: number | null;
  complexityLevel: string | null;
  requiredPreconditions: string[];
  missingRequirementDetails: string[];
  generatedByAgentRunId: string | null;
  createdBy: string | null;
}

export interface IAutomationGenerationRepository {
  /** Always inserts a new row (version = current max + 1) -- regeneration never loses history. */
  createNextVersion(input: CreateAutomationGenerationInput): Promise<AutomationGenerationEntity>;
  findById(id: string): Promise<AutomationGenerationEntity | null>;
  listByTestCaseId(testCaseId: string): Promise<AutomationGenerationEntity[]>;
  /** One DB round trip for the whole sprint's Automation tab list -- avoids N+1 per test case. */
  listLatestForTestCaseIds(testCaseIds: string[]): Promise<AutomationGenerationEntity[]>;
  markSaved(id: string): Promise<AutomationGenerationEntity>;
}
