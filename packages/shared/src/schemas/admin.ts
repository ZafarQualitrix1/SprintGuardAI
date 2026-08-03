import { z } from 'zod';

export const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  roleId: z.string().min(1).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export interface AdminUserSummary {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  roleKey: string;
  roleName: string;
  permissions: string[];
  createdAt: string;
}

export interface ResetUserPasswordResult {
  temporaryPassword: string;
}

export interface AdminDashboardSummary {
  scope: 'platform' | 'organization';
  totalOrganizations: number | null;
  activeProjects: number;
  activeSprints: number;
  connectedJiraProjects: number;
  totalUserStories: number;
  totalGeneratedTestCases: number;
  totalExecutions: number;
  totalBugs: number;
  activeAiAgents: number;
  totalUsers: number;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  organizationName: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: string;
}

export interface ListAuditLogsResult {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListAuditLogsParams {
  actorId?: string;
  action?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface FeatureFlagOverride {
  id: string;
  organizationId: string | null;
  userId: string | null;
  value: unknown;
  rolloutPercentage: number;
}

export interface FeatureFlag {
  id: string;
  key: string;
  description: string | null;
  defaultValue: unknown;
  isBeta: boolean;
  createdAt: string;
  overrides: FeatureFlagOverride[];
}

export const QUEUE_NAMES = ['integration-health-check', 'jira-auto-sync', 'jira-auto-sync-scanner'] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

export interface JobSummary {
  id: string;
  name: string;
  status: string;
  data: unknown;
  progress: unknown;
  attemptsMade: number;
  failedReason: string | null;
  timestamp: number;
  processedOn: number | null;
  finishedOn: number | null;
}

export interface QueueOverview {
  name: QueueName;
  counts: Record<string, number>;
  recentJobs: JobSummary[];
}

export interface RoleSummary {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
}

export interface PermissionCatalogEntry {
  key: string;
  description: string;
}

export interface RolesAndPermissions {
  roles: RoleSummary[];
  permissions: PermissionCatalogEntry[];
}
