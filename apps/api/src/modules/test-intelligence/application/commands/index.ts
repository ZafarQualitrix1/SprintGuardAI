// Command handlers (CQRS writes) for the TestIntelligence bounded context.
export * from './run-test-generation.command';

import { RunTestGenerationHandler } from './run-test-generation.command';

export const TEST_INTELLIGENCE_COMMAND_HANDLERS = [RunTestGenerationHandler];
