import { z } from 'zod';

export const createProjectSchema = z.object({
  key: z.string().min(2, 'Project key is required').max(10, 'Keep the key short, e.g. PROJ'),
  name: z.string().min(2, 'Project name is required'),
  description: z.string().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const importJiraSprintSchema = z.object({
  projectId: z.string().min(1, 'Choose a project'),
  connectionId: z.string().min(1, 'Connect a Jira account first'),
  reference: z.string().min(1, 'Paste a sprint id or board URL'),
});

// Smart Sprint Import (§2). Plain TS (not zod-validated client-side, since it's built entirely
// from UI state, not a user-typed form) -- the backend's SmartImportSelectionDto is the real gate.
export type SmartImportMode = 'ENTIRE' | 'SELECTED' | 'BY_EPIC' | 'BY_LABEL' | 'BY_ASSIGNEE';

export interface SmartImportSelection {
  mode: SmartImportMode;
  selectedExternalIds?: string[];
  epicName?: string;
  label?: string;
  assignee?: string;
  includeEpics: boolean;
  includeUserStories: boolean;
  includeTasks: boolean;
  includeSubtasks: boolean;
  includeBugs: boolean;
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

export type ImportJiraSprintInput = z.infer<typeof importJiraSprintSchema> & {
  smartImport?: SmartImportSelection;
};

export interface ExternalIssueSummary {
  externalId: string;
  title: string;
  issueType: string;
  epicKey: string | null;
  epicName: string | null;
  labels: string[];
  assignee: string | null;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description: string | null;
}

export interface Sprint {
  id: string;
  projectId: string;
  externalId: string | null;
  name: string;
  goal: string | null;
  status: string;
  source: string;
  startDate: string | null;
  endDate: string | null;
  canSync: boolean;
  lastSyncedAt: string | null;
  archivedAt: string | null;
  jiraSiteUrl: string | null;
}

export interface SprintSyncEvent {
  id: string;
  action: string;
  status: string;
  storiesCreated: number;
  storiesUpdated: number;
  errorMessage: string | null;
  triggeredBy: string | null;
  createdAt: string;
}

export interface Story {
  id: string;
  externalId: string | null;
  title: string;
  description: string | null;
  storyPoints: number | null;
  status: string;
  priority: string | null;
  assignee: string | null;
}

export interface SprintDetail extends Sprint {
  stories: Story[];
}
