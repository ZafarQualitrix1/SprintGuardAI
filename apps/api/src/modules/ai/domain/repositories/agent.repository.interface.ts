export const AGENT_REPOSITORY = Symbol('IAgentRepository');

export interface AgentCatalogEntry {
  id: string;
  key: string;
}

export interface IAgentRepository {
  findByKey(key: string): Promise<AgentCatalogEntry | null>;
  /** First agent whose `capabilities` array contains this capability string. */
  findByCapability(capability: string): Promise<AgentCatalogEntry | null>;
  /** Adds `capability` to the agent's `capabilities` array if not already present (Prompt Management). */
  appendCapability(agentId: string, capability: string): Promise<void>;
}
