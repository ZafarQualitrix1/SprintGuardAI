// Query handlers (CQRS reads) for the Coverage bounded context.
export * from './get-coverage-by-sprint.query';

import { GetCoverageBySprintHandler } from './get-coverage-by-sprint.query';

export const COVERAGE_QUERY_HANDLERS = [GetCoverageBySprintHandler];
