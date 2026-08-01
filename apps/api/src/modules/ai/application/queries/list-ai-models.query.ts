import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  IModelRegistryRepository,
  MODEL_REGISTRY_REPOSITORY,
  ModelRegistryEntryView,
} from '../../domain/repositories/model-registry.repository.interface';

export interface AiModelSummary extends ModelRegistryEntryView {
  speedLabel: string;
  bestUseCase: string;
}

// Small static display-metadata lookup for known models (speed/best-use-case) -- deliberately not
// a schema change; ModelRegistryEntry.costTier already covers the cost dimension. Unknown models
// (custom registry entries an admin adds directly to the DB) fall back to a generic description.
const MODEL_DISPLAY_METADATA: Record<string, { speedLabel: string; bestUseCase: string }> = {
  'gemini-2.5-pro': { speedLabel: 'Moderate', bestUseCase: 'Complex reasoning, long-context analysis' },
  'gemini-2.5-flash': { speedLabel: 'Fast', bestUseCase: 'High-volume, latency-sensitive generation' },
  'gemini-2.0-flash': { speedLabel: 'Fast', bestUseCase: 'General-purpose extraction and generation' },
  'gemini-1.5-pro': { speedLabel: 'Moderate', bestUseCase: 'Large-context document analysis' },
  'gemini-1.5-flash': { speedLabel: 'Fast', bestUseCase: 'Lightweight, high-throughput tasks' },
  'gpt-4o': { speedLabel: 'Moderate', bestUseCase: 'Complex multi-step reasoning' },
  'gpt-4o-mini': { speedLabel: 'Fast', bestUseCase: 'Cost-efficient general-purpose tasks' },
  'claude-sonnet-5': { speedLabel: 'Moderate', bestUseCase: 'Balanced reasoning and generation quality' },
  'claude-opus-5': { speedLabel: 'Slow', bestUseCase: 'Highest-quality reasoning for critical decisions' },
  'claude-haiku-4-5-20251001': { speedLabel: 'Fast', bestUseCase: 'High-volume, low-latency tasks' },
};

export class ListAiModelsQuery {}

@QueryHandler(ListAiModelsQuery)
export class ListAiModelsHandler implements IQueryHandler<ListAiModelsQuery, AiModelSummary[]> {
  constructor(
    @Inject(MODEL_REGISTRY_REPOSITORY) private readonly modelRegistryRepository: IModelRegistryRepository,
  ) {}

  async execute(): Promise<AiModelSummary[]> {
    const entries = await this.modelRegistryRepository.listAll();
    return entries.map((entry) => ({
      ...entry,
      speedLabel: MODEL_DISPLAY_METADATA[entry.model]?.speedLabel ?? 'Unknown',
      bestUseCase: MODEL_DISPLAY_METADATA[entry.model]?.bestUseCase ?? 'General-purpose',
    }));
  }
}
