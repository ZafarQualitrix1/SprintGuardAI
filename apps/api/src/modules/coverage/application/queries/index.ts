// Query handlers (CQRS reads) for the Coverage bounded context.
export * from './get-coverage-by-sprint.query';
export * from './get-story-coverage.query';

import { GetCoverageBySprintHandler } from './get-coverage-by-sprint.query';
import { GetStoryCoverageHandler } from './get-story-coverage.query';

export const COVERAGE_QUERY_HANDLERS = [GetCoverageBySprintHandler, GetStoryCoverageHandler];
