export const AI_RESPONSE_REPOSITORY = Symbol('IAiResponseRepository');

export interface CreateAiResponseInput {
  agentRunId: string;
  promptId: string;
  modelRegistryEntryId: string;
  promptVersion: string;
  promptHash: string;
  rawResponse: unknown;
  parsedResponse: unknown;
  confidenceScore: number;
  tokensUsed: number;
  latencyMs: number;
}

export interface IAiResponseRepository {
  create(input: CreateAiResponseInput): Promise<{ id: string }>;
}
