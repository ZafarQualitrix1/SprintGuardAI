// Command handlers (CQRS writes) for the Ai bounded context.
import { UpsertAiProviderConfigHandler } from './upsert-ai-provider-config.command';
import { SetProviderEnabledHandler } from './set-provider-enabled.command';
import { SetDefaultProviderHandler } from './set-default-provider.command';
import { TestAiProviderConnectionHandler } from './test-ai-provider-connection.command';
import { UpsertModuleAiConfigHandler } from './upsert-module-ai-config.command';

export * from './upsert-ai-provider-config.command';
export * from './set-provider-enabled.command';
export * from './set-default-provider.command';
export * from './test-ai-provider-connection.command';
export * from './upsert-module-ai-config.command';

export const AI_SETTINGS_COMMAND_HANDLERS = [
  UpsertAiProviderConfigHandler,
  SetProviderEnabledHandler,
  SetDefaultProviderHandler,
  TestAiProviderConnectionHandler,
  UpsertModuleAiConfigHandler,
];
