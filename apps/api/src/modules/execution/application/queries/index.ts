// Query handlers (CQRS reads) for the Execution bounded context.
export * from './get-executions-by-sprint.query';
export * from './get-executions-by-story.query';

import { GetExecutionsBySprintHandler } from './get-executions-by-sprint.query';
import { GetExecutionsByStoryHandler } from './get-executions-by-story.query';

export const EXECUTION_QUERY_HANDLERS = [GetExecutionsBySprintHandler, GetExecutionsByStoryHandler];
