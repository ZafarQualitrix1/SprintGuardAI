export const ORGANIZATION_SETTINGS_REPOSITORY = Symbol('IOrganizationSettingsRepository');

export interface OrganizationSettingsRecord {
  id: string;
  organizationId: string;
  domain: string | null;
  timezone: string;
  defaultLanguage: string;
  currency: string;
  dateFormat: string;
  workingDays: string[];
  businessHoursStart: string | null;
  businessHoursEnd: string | null;
  defaultProjectId: string | null;
  defaultSprintDurationDays: number | null;
  storyPointScale: number[];
  autoSaveIntervalSeconds: number | null;
  importSprintsEnabled: boolean;
  importUserStoriesEnabled: boolean;
  importBugsEnabled: boolean;
  importTestEvidenceEnabled: boolean;
  jiraAutoSyncEnabled: boolean;
  notifyEmail: boolean;
  notifySlack: boolean;
  notifyTeams: boolean;
  notifyBrowser: boolean;
  notifyRelease: boolean;
  notifySprintCompletion: boolean;
  notifyBug: boolean;
  notifyAiGeneration: boolean;
  notifyBaApproval: boolean;
  hasSlackWebhook: boolean;
  hasTeamsWebhook: boolean;
  sessionTimeoutMinutes: number | null;
  passwordMinLength: number | null;
  passwordRequireUppercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  allowedDomains: string[];
  allowedIpRanges: string[];
  automationFramework: string | null;
  automationBrowser: string | null;
  automationHeadless: boolean;
  automationParallelExecution: boolean;
  automationRetryCount: number | null;
  automationReportFormat: string | null;
  automationScreenshotPolicy: string | null;
  automationVideoPolicy: string | null;
  automationExecutionEnvironment: string | null;
  aiPromptApprovalRequired: boolean;
  aiLoggingEnabled: boolean;
  aiAuditTrailEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Partial patch -- every field optional, undefined = leave unchanged. Webhook URLs are handled
// separately (encrypt-before-store) rather than as plain strings here.
export type UpsertOrganizationSettingsInput = Partial<
  Omit<
    OrganizationSettingsRecord,
    'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'hasSlackWebhook' | 'hasTeamsWebhook'
  >
> & {
  slackWebhookEncrypted?: string | null;
  teamsWebhookEncrypted?: string | null;
};

export interface IOrganizationSettingsRepository {
  findByOrg(organizationId: string): Promise<OrganizationSettingsRecord | null>;
  findRawByOrg(organizationId: string): Promise<{ slackWebhookEncrypted: string | null; teamsWebhookEncrypted: string | null } | null>;
  upsert(organizationId: string, input: UpsertOrganizationSettingsInput): Promise<OrganizationSettingsRecord>;
}
