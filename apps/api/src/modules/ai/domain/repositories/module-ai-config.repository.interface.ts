export const MODULE_AI_CONFIG_REPOSITORY = Symbol('IModuleAiConfigRepository');

export interface ModuleAiConfigRecord {
  id: string;
  organizationId: string;
  capability: string;
  isEnabled: boolean;
  provider: string | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  retryCount: number | null;
  timeoutMs: number | null;
  streaming: boolean | null;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertModuleAiConfigInput {
  organizationId: string;
  capability: string;
  isEnabled?: boolean;
  provider?: string | null;
  model?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  retryCount?: number | null;
  timeoutMs?: number | null;
  streaming?: boolean | null;
  fallbackProvider?: string | null;
  fallbackModel?: string | null;
}

export interface IModuleAiConfigRepository {
  findByOrgAndCapability(organizationId: string, capability: string): Promise<ModuleAiConfigRecord | null>;
  listByOrg(organizationId: string): Promise<ModuleAiConfigRecord[]>;
  upsert(input: UpsertModuleAiConfigInput): Promise<ModuleAiConfigRecord>;
}
