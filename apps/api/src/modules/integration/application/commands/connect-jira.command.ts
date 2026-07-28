import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { JiraConnectorService } from '../../infrastructure/connectors/jira-connector.service';
import { IntegrationConnectionEntity } from '../../domain/entities/integration-connection.entity';

export class ConnectJiraCommand {
  constructor(
    public readonly organizationId: string,
    public readonly name: string,
    public readonly siteUrl: string,
    public readonly email: string,
    public readonly apiToken: string,
  ) {}
}

@CommandHandler(ConnectJiraCommand)
export class ConnectJiraHandler implements ICommandHandler<ConnectJiraCommand, IntegrationConnectionEntity> {
  constructor(
    private readonly jiraConnector: JiraConnectorService,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
  ) {}

  async execute(command: ConnectJiraCommand): Promise<IntegrationConnectionEntity> {
    // Normalize to just the site origin -- users often paste a board/project URL rather than the
    // bare Jira site root, and every downstream Agile API call is built as `${siteUrl}/rest/...`.
    const config = { siteUrl: new URL(command.siteUrl).origin };
    const credentials = { email: command.email, apiToken: command.apiToken };

    // Fail fast with a clear error rather than persisting a connection that can never fetch data.
    await this.jiraConnector.verifyCredentials(credentials, config);

    const credentialsEncrypted = this.credentialVault.encrypt(JSON.stringify(credentials));

    return this.connectionRepository.create({
      organizationId: command.organizationId,
      connectorKey: this.jiraConnector.key,
      name: command.name,
      credentialsEncrypted,
      config,
    });
  }
}
