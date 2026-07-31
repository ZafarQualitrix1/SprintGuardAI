import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JiraConnectorService } from '../../infrastructure/connectors/jira-connector.service';

export interface VerifyCredentialsResult {
  healthy: boolean;
  error?: string;
}

// Backs the "Test Connection" button in the add-connection dialog, before anything is persisted --
// distinct from TestConnectionCommand, which re-checks an already-saved connection by id.
export class VerifyJiraCredentialsCommand {
  constructor(
    public readonly siteUrl: string,
    public readonly email: string,
    public readonly apiToken: string,
  ) {}
}

@CommandHandler(VerifyJiraCredentialsCommand)
export class VerifyJiraCredentialsHandler
  implements ICommandHandler<VerifyJiraCredentialsCommand, VerifyCredentialsResult>
{
  constructor(private readonly jiraConnector: JiraConnectorService) {}

  async execute(command: VerifyJiraCredentialsCommand): Promise<VerifyCredentialsResult> {
    const config = { siteUrl: new URL(command.siteUrl).origin };
    const credentials = { email: command.email, apiToken: command.apiToken };

    try {
      await this.jiraConnector.verifyCredentials(credentials, config);
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: error instanceof Error ? error.message : 'Verification failed' };
    }
  }
}
