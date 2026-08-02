// Query handlers (CQRS reads) for the Prompt Management bounded context.
export * from './list-prompts.query';
export * from './get-prompt-history.query';
export * from './get-prompt-version.query';
export * from './compare-prompt-versions.query';
export * from './get-prompt-variables.query';
export * from './list-prompt-executions.query';
export * from './get-prompt-analytics.query';

import { ListPromptsHandler } from './list-prompts.query';
import { GetPromptHistoryHandler } from './get-prompt-history.query';
import { GetPromptVersionHandler } from './get-prompt-version.query';
import { ComparePromptVersionsHandler } from './compare-prompt-versions.query';
import { GetPromptVariablesHandler } from './get-prompt-variables.query';
import { ListPromptExecutionsHandler } from './list-prompt-executions.query';
import { GetPromptAnalyticsHandler } from './get-prompt-analytics.query';

export const PROMPT_MANAGEMENT_QUERY_HANDLERS = [
  ListPromptsHandler,
  GetPromptHistoryHandler,
  GetPromptVersionHandler,
  ComparePromptVersionsHandler,
  GetPromptVariablesHandler,
  ListPromptExecutionsHandler,
  GetPromptAnalyticsHandler,
];
