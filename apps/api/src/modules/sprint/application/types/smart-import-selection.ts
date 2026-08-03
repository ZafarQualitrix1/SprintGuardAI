// Smart Sprint Import (§2): what to import and how to scope it, threaded from the wizard's
// "Selection" step through ImportSprintFromJiraCommand. Optional on the command -- omitting it
// keeps the pre-existing "import everything, thin fields" behavior unchanged.
export type SmartImportMode = 'ENTIRE' | 'SELECTED' | 'BY_EPIC' | 'BY_LABEL' | 'BY_ASSIGNEE';

export interface SmartImportSelection {
  mode: SmartImportMode;
  /** Required when mode is SELECTED. */
  selectedExternalIds?: string[];
  /** Required when mode is BY_EPIC. */
  epicName?: string;
  /** Required when mode is BY_LABEL. */
  label?: string;
  /** Required when mode is BY_ASSIGNEE. */
  assignee?: string;

  // Issue-type inclusion filters.
  includeEpics: boolean;
  includeUserStories: boolean;
  includeTasks: boolean;
  includeSubtasks: boolean;
  includeBugs: boolean;

  // Field-level content toggles -- each one controls a single cheap, already-fetched field, so
  // unchecking one never costs an extra Jira API call, only omits that field from the imported row.
  includeSprintDetails: boolean;
  includeAcceptanceCriteria: boolean;
  includeStoryLinks: boolean;
  includeLabels: boolean;
  includeComponents: boolean;
  includeStoryPoints: boolean;
  includeAssignees: boolean;
  includeAttachments: boolean;
  includeComments: boolean;
}
