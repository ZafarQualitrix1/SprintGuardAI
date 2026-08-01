// Query handlers (CQRS reads) for the Ai bounded context.
import { ListAiProvidersHandler } from './list-ai-providers.query';
import { ListAiModelsHandler } from './list-ai-models.query';
import { ListModuleAiConfigsHandler } from './list-module-ai-configs.query';

export * from './list-ai-providers.query';
export * from './list-ai-models.query';
export * from './list-module-ai-configs.query';

export const AI_SETTINGS_QUERY_HANDLERS = [ListAiProvidersHandler, ListAiModelsHandler, ListModuleAiConfigsHandler];
