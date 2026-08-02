export interface AutomationFile {
  path: string;
  content: string;
}

export interface AutomationGeneration {
  id: string;
  testCaseId: string;
  automationType: 'API' | 'UI';
  version: number;
  status: 'GENERATED' | 'SAVED' | 'COMMITTED';
  frameworkVersion: string;
  generatorVersion: string;
  aiModelVersion: string;
  automationReadinessScore: number | null;
  estimatedEffortHours: number | null;
  complexityLevel: string | null;
  requiredPreconditions: string[];
  missingRequirementDetails: string[];
  createdAt: string;
}

export interface AutomationGenerationDetail extends AutomationGeneration {
  files: AutomationFile[];
}

export interface AutomationCandidate {
  testCaseId: string;
  testCaseTitle: string;
  storyId: string;
  storyTitle: string;
  priority: string;
  testType: string;
  automationStatus: string;
  automationType: string;
  apiEndpoint: string | null;
  uiScreen: string | null;
  latestApi: AutomationGeneration | null;
  latestUi: AutomationGeneration | null;
}
