// Query handlers (CQRS reads) for the Integration bounded context.
export * from './list-integration-connections.query';
export * from './fetch-external-sprint.query';

import { ListIntegrationConnectionsHandler } from './list-integration-connections.query';
import { FetchExternalSprintHandler } from './fetch-external-sprint.query';

export const INTEGRATION_QUERY_HANDLERS = [ListIntegrationConnectionsHandler, FetchExternalSprintHandler];
