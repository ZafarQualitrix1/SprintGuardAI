export const MODEL_REGISTRY_REPOSITORY = Symbol('IModelRegistryRepository');

export interface ModelRegistryEntry {
  id: string;
  provider: string;
  model: string;
}

export interface IModelRegistryRepository {
  findActiveForCapability(provider: string, capability: string): Promise<ModelRegistryEntry | null>;
}
