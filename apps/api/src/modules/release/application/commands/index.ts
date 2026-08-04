// Command handlers (CQRS writes) for the Release bounded context.
export * from './compute-release-readiness.command';
export * from './update-release-scoring-config.command';
export * from './update-sprint-release-gates.command';

import { ComputeReleaseReadinessHandler } from './compute-release-readiness.command';
import { UpdateReleaseScoringConfigHandler } from './update-release-scoring-config.command';
import { UpdateSprintReleaseGatesHandler } from './update-sprint-release-gates.command';

export const RELEASE_COMMAND_HANDLERS = [
  ComputeReleaseReadinessHandler,
  UpdateReleaseScoringConfigHandler,
  UpdateSprintReleaseGatesHandler,
];
