export const AUTOMATION_RUN_CONTEXT_READ_REPOSITORY = Symbol('IAutomationRunContextReadRepository');

export interface AutomationFile {
  path: string;
  content: string;
}

export interface AutomationGenerationRunContext {
  id: string;
  automationType: 'API' | 'UI';
  files: AutomationFile[];
}

// Read-only cross-cutting access into the `automation` module's AutomationGeneration rows -- same
// local-read-port pattern as execution's ITestCaseReadRepository / coverage's
// ICoverageSourceReadRepository, rather than importing automation's infrastructure directly.
export interface IAutomationRunContextReadRepository {
  /** Confirms the generation belongs to this story/org before a run can be triggered against it. */
  findGenerationForStory(
    automationGenerationId: string,
    storyId: string,
    organizationId: string,
  ): Promise<AutomationGenerationRunContext | null>;
  findFilesByGenerationId(automationGenerationId: string): Promise<AutomationFile[] | null>;
}
