// Query handlers (CQRS reads) for the Sprint bounded context.
export * from './list-projects.query';
export * from './list-sprints.query';
export * from './get-sprint.query';
export * from './get-sprint-sync-history.query';

import { ListProjectsHandler } from './list-projects.query';
import { ListSprintsHandler } from './list-sprints.query';
import { GetSprintHandler } from './get-sprint.query';
import { GetSprintSyncHistoryHandler } from './get-sprint-sync-history.query';

export const SPRINT_QUERY_HANDLERS = [
  ListProjectsHandler,
  ListSprintsHandler,
  GetSprintHandler,
  GetSprintSyncHistoryHandler,
];
