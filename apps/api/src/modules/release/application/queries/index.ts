// Query handlers (CQRS reads) for the Release bounded context.
export * from './get-latest-release-report.query';
export * from './get-release-scoring-config.query';
export * from './get-sprint-release-gates.query';

import { GetLatestReleaseReportHandler } from './get-latest-release-report.query';
import { GetReleaseScoringConfigHandler } from './get-release-scoring-config.query';
import { GetSprintReleaseGatesHandler } from './get-sprint-release-gates.query';

export const RELEASE_QUERY_HANDLERS = [
  GetLatestReleaseReportHandler,
  GetReleaseScoringConfigHandler,
  GetSprintReleaseGatesHandler,
];
