// Command handlers (CQRS writes) for the Coverage bounded context.
export * from './compute-coverage.command';
export * from './compute-story-coverage.command';

import { ComputeCoverageHandler } from './compute-coverage.command';
import { ComputeStoryCoverageHandler } from './compute-story-coverage.command';

export const COVERAGE_COMMAND_HANDLERS = [ComputeCoverageHandler, ComputeStoryCoverageHandler];
