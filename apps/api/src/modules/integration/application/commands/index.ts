// Command handlers (CQRS writes) for the Integration bounded context.
export * from './connect-jira.command';
export * from './update-connection.command';
export * from './disconnect-connection.command';
export * from './delete-connection.command';
export * from './set-default-connection.command';
export * from './test-connection.command';
export * from './sync-connection.command';
export * from './verify-jira-credentials.command';

import { ConnectJiraHandler } from './connect-jira.command';
import { UpdateConnectionHandler } from './update-connection.command';
import { DisconnectConnectionHandler } from './disconnect-connection.command';
import { DeleteConnectionHandler } from './delete-connection.command';
import { SetDefaultConnectionHandler } from './set-default-connection.command';
import { TestConnectionHandler } from './test-connection.command';
import { SyncConnectionHandler } from './sync-connection.command';
import { VerifyJiraCredentialsHandler } from './verify-jira-credentials.command';

export const INTEGRATION_COMMAND_HANDLERS = [
  ConnectJiraHandler,
  UpdateConnectionHandler,
  DisconnectConnectionHandler,
  DeleteConnectionHandler,
  SetDefaultConnectionHandler,
  TestConnectionHandler,
  SyncConnectionHandler,
  VerifyJiraCredentialsHandler,
];
