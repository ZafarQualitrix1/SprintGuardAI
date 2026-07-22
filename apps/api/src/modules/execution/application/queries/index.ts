// Query handlers (CQRS reads) for the Execution bounded context.
export * from './get-executions-by-sprint.query';

import { GetExecutionsBySprintHandler } from './get-executions-by-sprint.query';

export const EXECUTION_QUERY_HANDLERS = [GetExecutionsBySprintHandler];
