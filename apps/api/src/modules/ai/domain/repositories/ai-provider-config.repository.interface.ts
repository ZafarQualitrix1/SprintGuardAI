export const AI_PROVIDER_CONFIG_REPOSITORY = Symbol('IAiProviderConfigRepository');

export interface AiProviderConfigRecord {
  id: string;
  organizationId: string;
  provider: string;
  isEnabled: boolean;
  isDefault: boolean;
  apiKeyEncrypted: string | null;
  defaultModel: string | null;
  projectId: string | null;
  region: string | null;
  timeoutMs: number | null;
  retryCount: number | null;
  temperature: number | null;
  topP: number | null;
  topK: number | null;
  maxOutputTokens: number | null;
  streaming: boolean;
  safetySettings: unknown;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  healthStatus: string;
  lastConnectedAt: Date | null;
  lastTestLatencyMs: number | null;
  lastTestError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertAiProviderConfigInput {
  organizationId: string;
  provider: string;
  // Omitted entirely = leave the currently-stored key untouched (same "blank keeps current"
  // convention as UpdateConnectionCommand for Jira credentials).
  apiKeyEncrypted?: string;
  defaultModel?: string | null;
  projectId?: string | null;
  region?: string | null;
  timeoutMs?: number | null;
  retryCount?: number | null;
  temperature?: number | null;
  topP?: number | null;
  topK?: number | null;
  maxOutputTokens?: number | null;
  streaming?: boolean;
  safetySettings?: unknown;
  fallbackProvider?: string | null;
  fallbackModel?: string | null;
}

export interface UpdateProviderHealthInput {
  healthStatus: string;
  lastConnectedAt?: Date;
  lastTestLatencyMs?: number | null;
  lastTestError?: string | null;
}

export interface IAiProviderConfigRepository {
  findByOrgAndProvider(organizationId: string, provider: string): Promise<AiProviderConfigRecord | null>;
  listByOrg(organizationId: string): Promise<AiProviderConfigRecord[]>;
  upsert(input: UpsertAiProviderConfigInput): Promise<AiProviderConfigRecord>;
  setEnabled(organizationId: string, provider: string, isEnabled: boolean): Promise<AiProviderConfigRecord>;
  setDefault(organizationId: string, provider: string): Promise<AiProviderConfigRecord>;
  updateHealth(
    organizationId: string,
    provider: string,
    input: UpdateProviderHealthInput,
  ): Promise<AiProviderConfigRecord>;
}
