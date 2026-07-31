import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { INTEGRATION_CONNECTORS, IIntegrationConnector } from '../ports/integration-connector.port';

export interface SyncConnectionResult {
  lastSyncedAt: Date;
  projectCount: number;
}

// "Sync" here means: refresh what we know ABOUT the workspace (health + cached project list) --
// it deliberately does NOT re-import any sprints. Sprint import stays an explicit,
// wizard-driven action (see FetchExternalSprintQuery / POST /sprints/import/jira), never
// something a background/on-demand sync triggers unattended.
export class SyncConnectionCommand {
  constructor(
    public readonly organizationId: string,
    public readonly connectionId: string,
  ) {}
}

@CommandHandler(SyncConnectionCommand)
export class SyncConnectionHandler implements ICommandHandler<SyncConnectionCommand, SyncConnectionResult> {
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    @Inject(INTEGRATION_CONNECTORS) private readonly connectors: IIntegrationConnector[],
  ) {}

  async execute(command: SyncConnectionCommand): Promise<SyncConnectionResult> {
    const connection = await this.connectionRepository.findCredentialsById(
      command.connectionId,
      command.organizationId,
    );
    if (!connection) {
      throw new NotFoundException('Integration connection not found');
    }

    const connector = this.connectors.find((c) => c.key === connection.connectorKey);
    if (!connector) {
      throw new NotFoundException(`No connector registered for "${connection.connectorKey}"`);
    }

    const credentials = JSON.parse(this.credentialVault.decrypt(connection.credentialsEncrypted));
    const projects = await connector.fetchProjects(credentials, connection.config);
    await this.connectionRepository.upsertProjects(command.connectionId, projects);

    const now = new Date();
    await this.connectionRepository.updateHealth(command.connectionId, 'HEALTHY', now, 'CONNECTED');
    await this.connectionRepository.updateSyncTimestamp(command.connectionId, now);

    return { lastSyncedAt: now, projectCount: projects.length };
  }
}
