// Query handlers (CQRS reads) for the Sprint bounded context.
export * from './list-projects.query';
export * from './list-sprints.query';
export * from './get-sprint.query';

import { ListProjectsHandler } from './list-projects.query';
import { ListSprintsHandler } from './list-sprints.query';
import { GetSprintHandler } from './get-sprint.query';

export const SPRINT_QUERY_HANDLERS = [ListProjectsHandler, ListSprintsHandler, GetSprintHandler];
