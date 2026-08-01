export interface AiCompletionRequest {
  systemPrompt: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  // Resolved credential (DB-configured, decrypted) for this call's organization/provider. When
  // omitted, the provider adapter falls back to its env-var-configured key (Solution Architecture
  // §16.1) -- keeps every pre-existing env-var-only deployment working unmigrated.
  apiKey?: string;
}

export interface AiCompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

// Strategy pattern (Solution Architecture §16.1). Model name/SDK-specific auth/request-response
// translation are fully encapsulated per adapter -- AiOrchestrationService depends only on this.
export interface IAiProvider {
  readonly key: string;
  complete(request: AiCompletionRequest, model: string): Promise<AiCompletionResult>;
}

// Multi-provider injection token, same pattern as Integration Hub's INTEGRATION_CONNECTORS.
export const AI_PROVIDERS = Symbol('AiProviders');
