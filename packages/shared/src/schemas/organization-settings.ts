import { z } from 'zod';

export const upsertOrganizationSettingsSchema = z.object({
  domain: z.string().optional(),
  timezone: z.string().optional(),
  defaultLanguage: z.string().optional(),
  currency: z.string().optional(),
  dateFormat: z.string().optional(),
  workingDays: z.array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])).optional(),
  businessHoursStart: z.string().optional(),
  businessHoursEnd: z.string().optional(),
  defaultProjectId: z.string().optional(),
  defaultSprintDurationDays: z.coerce.number().min(1).max(90).optional(),
  storyPointScale: z.array(z.coerce.number()).optional(),
  autoSaveIntervalSeconds: z.coerce.number().min(5).optional(),
  importSprintsEnabled: z.boolean().optional(),
  importUserStoriesEnabled: z.boolean().optional(),
  importBugsEnabled: z.boolean().optional(),
  importTestEvidenceEnabled: z.boolean().optional(),
  jiraAutoSyncEnabled: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifySlack: z.boolean().optional(),
  notifyTeams: z.boolean().optional(),
  notifyBrowser: z.boolean().optional(),
  notifyRelease: z.boolean().optional(),
  notifySprintCompletion: z.boolean().optional(),
  notifyBug: z.boolean().optional(),
  notifyAiGeneration: z.boolean().optional(),
  notifyBaApproval: z.boolean().optional(),
  slackWebhookUrl: z.string().optional(),
  teamsWebhookUrl: z.string().optional(),
  sessionTimeoutMinutes: z.coerce.number().min(5).max(1440).optional(),
  passwordMinLength: z.coerce.number().min(6).max(64).optional(),
  passwordRequireUppercase: z.boolean().optional(),
  passwordRequireNumber: z.boolean().optional(),
  passwordRequireSymbol: z.boolean().optional(),
  allowedDomains: z.array(z.string()).optional(),
  allowedIpRanges: z.array(z.string()).optional(),
  automationFramework: z.string().optional(),
  automationBrowser: z.string().optional(),
  automationHeadless: z.boolean().optional(),
  automationParallelExecution: z.boolean().optional(),
  automationRetryCount: z.coerce.number().min(0).max(5).optional(),
  automationReportFormat: z.string().optional(),
  automationScreenshotPolicy: z.string().optional(),
  automationVideoPolicy: z.string().optional(),
  automationExecutionEnvironment: z.string().optional(),
  aiPromptApprovalRequired: z.boolean().optional(),
  aiLoggingEnabled: z.boolean().optional(),
  aiAuditTrailEnabled: z.boolean().optional(),
});
export type UpsertOrganizationSettingsInput = z.infer<typeof upsertOrganizationSettingsSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  roleKey: z.string().min(1, 'Select a role'),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().min(2, 'Enter your full name'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export interface OrganizationSettings {
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
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettingsBackup {
  exportedAt: string;
  settings: Record<string, unknown>;
}

export interface OrganizationMember {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  roleId: string;
  roleKey: string;
  roleName: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  roleId: string;
  roleKey: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface InviteMemberResult {
  invitation: Invitation;
  token: string;
  emailSent: boolean;
}

export interface OrganizationBranding {
  logoUrl: string | null;
  primaryColor: string | null;
}

export interface UploadOrganizationLogoResult {
  logoUrl: string;
}

export interface SendTestNotificationResult {
  delivered: boolean;
  error?: string;
}

// Supported roles today (packages/database/prisma/seed.ts ROLES), for the invite/role-change
// dropdown. PROMPT_APPROVER is intentionally excluded -- it's an additive capability grant, not
// meant as someone's primary organizational role.
export const ASSIGNABLE_ROLE_KEYS = [
  'OWNER',
  'ADMIN',
  'PROJECT_ADMIN',
  'QA_LEAD',
  'QA_ENGINEER',
  'PRODUCT_MANAGER',
  'ENGINEER',
  'VIEWER',
] as const;
