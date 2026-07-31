import { z } from 'zod';

const siteUrlSchema = z
  .string()
  .url('Enter your full Jira site URL, e.g. https://acme.atlassian.net')
  .refine((value) => /^https?:\/\/[^/]+\/?$/i.test(value), {
    message: 'Enter just the site root (e.g. https://acme.atlassian.net) -- not a board or project link',
  });

export const connectJiraSchema = z.object({
  name: z.string().min(2, 'Give this connection a name'),
  siteUrl: siteUrlSchema,
  email: z.string().email('Enter the email address tied to your Jira API token'),
  apiToken: z.string().min(10, 'Paste your Atlassian API token'),
  isDefault: z.boolean().default(false),
});
export type ConnectJiraInput = z.infer<typeof connectJiraSchema>;

// Separate from connectJiraSchema (rather than making every field conditionally required) --
// apiToken is optional here ("leave blank to keep current"), unlike create where it's mandatory.
export const updateConnectionSchema = z.object({
  name: z.string().min(2, 'Give this connection a name'),
  siteUrl: siteUrlSchema,
  email: z.string().email('Enter the email address tied to your Jira API token'),
  apiToken: z.union([z.string().min(10, 'Paste your Atlassian API token'), z.literal('')]).optional(),
  isDefault: z.boolean().default(false),
});
export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>;

export type ConnectionStatus = 'PENDING' | 'CONNECTED' | 'ERROR' | 'DISCONNECTED';
export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';

export interface IntegrationConnection {
  id: string;
  connectorKey: string;
  name: string;
  siteUrl: string;
  email: string | null;
  status: ConnectionStatus;
  isDefault: boolean;
  healthStatus: HealthStatus;
  lastHealthCheckAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerifyCredentialsResult {
  healthy: boolean;
  error?: string;
}

export interface TestConnectionResult {
  healthStatus: 'HEALTHY' | 'UNHEALTHY';
  lastHealthCheckAt: string;
  error?: string;
}

export interface SyncConnectionResult {
  lastSyncedAt: string;
  projectCount: number;
}

export interface ExternalProject {
  externalKey: string;
  name: string;
  avatarUrl: string | null;
  lead: string | null;
}

export interface ExternalBoard {
  id: string;
  name: string;
  type: string;
}

export interface ExternalSprintOption {
  externalId: string;
  name: string;
  state: string;
  startDate: string | null;
  endDate: string | null;
}
