import { ApprovalDecision, PromptApprovalEntity, PromptEntity, PromptLibraryRow, PromptStatus } from '../entities/prompt.entity';

export const PROMPT_REPOSITORY = Symbol('IPromptRepository');

export interface PromptListFilter {
  // Used only to resolve "what provider/model would run this for my org" display columns
  // (ModuleAiConfig/AiProviderConfig are per-org) -- AiPrompt itself is a global/shared catalog,
  // same as Agent/ModelRegistryEntry, so this never restricts which prompt rows are returned.
  organizationId: string;
  search?: string;
  category?: string;
  status?: PromptStatus;
  createdBy?: string;
  page: number;
  pageSize: number;
}

export interface CreatePromptInput {
  capability: string;
  agentKey: string;
  name: string | null;
  description: string | null;
  category: string | null;
  tags: string[];
  template: string;
  jsonSchema: unknown;
  createdBy: string;
}

export interface CreateVersionInput {
  template: string;
  jsonSchema: unknown;
  name: string | null;
  description: string | null;
  category: string | null;
  // Optional: falls back to the previous version's tags when omitted (a new version usually keeps
  // the same tags unless the admin explicitly changes them).
  tags?: string[];
  changeSummary: string | null;
  createdBy: string;
}

export interface UpdateDraftInput {
  template?: string;
  jsonSchema?: unknown;
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  changeSummary?: string;
}

export interface IPromptRepository {
  list(filter: PromptListFilter): Promise<{ rows: PromptLibraryRow[]; total: number }>;
  findHistory(capability: string): Promise<PromptEntity[]>;
  findOne(capability: string, version: string): Promise<PromptEntity | null>;
  findById(id: string): Promise<PromptEntity | null>;
  /** Distinct capability strings that already have at least one prompt (for uniqueness checks / dropdowns). */
  listCapabilities(): Promise<string[]>;
  create(input: CreatePromptInput): Promise<PromptEntity>;
  createVersion(capability: string, input: CreateVersionInput): Promise<PromptEntity>;
  updateDraft(id: string, patch: UpdateDraftInput): Promise<PromptEntity>;
  setStatus(id: string, status: PromptStatus): Promise<PromptEntity>;
  /** Sets isActive=true on `id` and false on the previous active version of the same capability, atomically. */
  activate(id: string, capability: string): Promise<PromptEntity>;
  createApproval(promptId: string, reviewerId: string, decision: ApprovalDecision, rationale: string | null): Promise<PromptApprovalEntity>;
  countResponsesForPrompt(promptId: string): Promise<number>;
  delete(id: string): Promise<void>;
}
