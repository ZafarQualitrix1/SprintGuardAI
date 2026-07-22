export const AI_PROMPT_REPOSITORY = Symbol('IAiPromptRepository');

export interface ActivePrompt {
  id: string;
  capability: string;
  version: string;
  template: string;
  templateHash: string;
}

export interface IAiPromptRepository {
  findActiveByCapability(capability: string): Promise<ActivePrompt | null>;
}
