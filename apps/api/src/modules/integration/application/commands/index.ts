// Command handlers (CQRS writes) for the Integration bounded context.
export * from './connect-jira.command';

import { ConnectJiraHandler } from './connect-jira.command';

export const INTEGRATION_COMMAND_HANDLERS = [ConnectJiraHandler];
