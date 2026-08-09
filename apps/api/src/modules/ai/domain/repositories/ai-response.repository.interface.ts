export const AI_RESPONSE_REPOSITORY = Symbol('IAiResponseRepository');

export interface CreateAiResponseInput {
  agentRunId: string;
  promptId: string;
  // Undefined when the model came from a ModuleAiConfig override rather than the ModelRegistry
  // lookup (AI Settings §4/§17) -- the override model may not have a registry entry at all.
  modelRegistryEntryId?: string;
  promptVersion: string;
  promptHash: string;
  rawResponse: unknown;
  parsedResponse: unknown;
  confidenceScore: number;
  tokensUsed: number;
  // Split out of tokensUsed (which stays as the sum) -- the provider response already returns these
  // separately, previously discarded before persistence.
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  costUsd?: number;
}

export interface IAiResponseRepository {
  create(input: CreateAiResponseInput): Promise<{ id: string }>;
}
