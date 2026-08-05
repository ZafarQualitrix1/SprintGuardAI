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
  isOutdated: boolean;
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

// API Automation module's grid row -- BA-approved+locked, API-type candidates only, org-wide
// (Project -> Sprint -> Story filterable), distinct from AutomationCandidate (the old per-sprint
// tab's shape) since this carries the extra columns the module's grid needs.
export interface ApprovedApiAutomationCandidate {
  testCaseId: string;
  displayId: string | null;
  testCaseTitle: string;
  storyId: string;
  storyExternalId: string | null;
  storyTitle: string;
  apiEndpoint: string | null;
  requestMethod: string | null;
  priority: string;
  automationStatus: string;
  createdAt: string;
  updatedAt: string;
  latestGeneration: AutomationGeneration | null;
}
