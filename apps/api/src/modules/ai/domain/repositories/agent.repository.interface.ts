export const AGENT_REPOSITORY = Symbol('IAgentRepository');

export interface AgentCatalogEntry {
  id: string;
  key: string;
}

export interface IAgentRepository {
  findByKey(key: string): Promise<AgentCatalogEntry | null>;
}
