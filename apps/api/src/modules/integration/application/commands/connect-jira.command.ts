import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { JiraConnectorService } from '../../infrastructure/connectors/jira-connector.service';
import { AuditLogService } from '../../infrastructure/services/audit-log.service';
import { IntegrationConnectionEntity } from '../../domain/entities/integration-connection.entity';

export class ConnectJiraCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly name: string,
    public readonly siteUrl: string,
    public readonly email: string,
    public readonly apiToken: string,
    /** User-requested default, via the "Default Workspace" checkbox in the add-connection dialog. */
    public readonly requestedDefault: boolean = false,
  ) {}
}

@CommandHandler(ConnectJiraCommand)
export class ConnectJiraHandler implements ICommandHandler<ConnectJiraCommand, IntegrationConnectionEntity> {
  constructor(
    private readonly jiraConnector: JiraConnectorService,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(command: ConnectJiraCommand): Promise<IntegrationConnectionEntity> {
    // Normalize to just the site origin -- users often paste a board/project URL rather than the
    // bare Jira site root, and every downstream Agile API call is built as `${siteUrl}/rest/...`.
    const siteUrl = new URL(command.siteUrl).origin;
    const config = { siteUrl };
    const credentials = { email: command.email, apiToken: command.apiToken };

    // Fail fast with a clear error rather than persisting a connection that can never fetch data.
    await this.jiraConnector.verifyCredentials(credentials, config);

    const credentialsEncrypted = this.credentialVault.encrypt(JSON.stringify(credentials));

    // First connection for this org+connector auto-becomes the default -- there's never a
    // moment where an org has connections but none is the default. A user can also explicitly
    // request default via the add-connection dialog's checkbox.
    const isFirst = !(await this.connectionRepository.hasAnyForConnector(
      command.organizationId,
      this.jiraConnector.key,
    ));

    let connection = await this.connectionRepository.create({
      organizationId: command.organizationId,
      connectorKey: this.jiraConnector.key,
      name: command.name,
      siteUrl,
      email: command.email,
      credentialsEncrypted,
      config,
      isDefault: isFirst,
    });

    // Only need the clear-siblings dance when this wasn't already the (only, thus default) row.
    if (command.requestedDefault && !isFirst) {
      connection = await this.connectionRepository.setDefault(connection.id, command.organizationId);
    }

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'integration.connected',
      'IntegrationConnection',
      connection.id,
      undefined,
      { name: command.name, siteUrl, email: command.email },
    );

    return connection;
  }
}
