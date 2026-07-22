// Command handlers (CQRS writes) for the Release bounded context.
export * from './compute-release-readiness.command';

import { ComputeReleaseReadinessHandler } from './compute-release-readiness.command';

export const RELEASE_COMMAND_HANDLERS = [ComputeReleaseReadinessHandler];
