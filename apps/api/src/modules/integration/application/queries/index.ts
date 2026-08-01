// Query handlers (CQRS reads) for the Integration bounded context.
export * from './list-integration-connections.query';
export * from './fetch-external-sprint.query';
export * from './fetch-external-projects.query';
export * from './fetch-external-boards.query';
export * from './fetch-external-active-sprints.query';
export * from './fetch-external-issue-detail.query';

import { ListIntegrationConnectionsHandler } from './list-integration-connections.query';
import { FetchExternalSprintHandler } from './fetch-external-sprint.query';
import { FetchExternalProjectsHandler } from './fetch-external-projects.query';
import { FetchExternalBoardsHandler } from './fetch-external-boards.query';
import { FetchExternalActiveSprintsHandler } from './fetch-external-active-sprints.query';
import { FetchExternalIssueDetailHandler } from './fetch-external-issue-detail.query';

export const INTEGRATION_QUERY_HANDLERS = [
  ListIntegrationConnectionsHandler,
  FetchExternalSprintHandler,
  FetchExternalProjectsHandler,
  FetchExternalBoardsHandler,
  FetchExternalActiveSprintsHandler,
  FetchExternalIssueDetailHandler,
];
