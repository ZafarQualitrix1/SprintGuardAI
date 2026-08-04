// Command handlers (CQRS writes) for the TestIntelligence bounded context.
export * from './run-test-scenario-generation.command';
export * from './run-test-case-generation.command';

import { RunTestScenarioGenerationHandler } from './run-test-scenario-generation.command';
import { RunTestCaseGenerationHandler } from './run-test-case-generation.command';

export const TEST_INTELLIGENCE_COMMAND_HANDLERS = [RunTestScenarioGenerationHandler, RunTestCaseGenerationHandler];
