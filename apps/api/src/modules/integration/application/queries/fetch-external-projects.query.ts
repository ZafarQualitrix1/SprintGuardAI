import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import { ExternalProjectPayload, IIntegrationConnector, INTEGRATION_CONNECTORS } from '../ports/integration-connector.port';

// Import wizard step 2. Same org-scoped credential-lookup pattern as FetchExternalSprintHandler.
export class FetchExternalProjectsQuery {
  constructor(
    public readonly organizationId: string,
    public readonly connectionId: string,
  ) {}
}

@QueryHandler(FetchExternalProjectsQuery)
export class FetchExternalProjectsHandler
  implements IQueryHandler<FetchExternalProjectsQuery, ExternalProjectPayload[]>
{
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    @Inject(INTEGRATION_CONNECTORS) private readonly connectors: IIntegrationConnector[],
  ) {}

  async execute(query: FetchExternalProjectsQuery): Promise<ExternalProjectPayload[]> {
    const connection = await this.connectionRepository.findCredentialsById(query.connectionId, query.organizationId);
    if (!connection) {
      throw new NotFoundException('Integration connection not found');
    }

    const connector = this.connectors.find((c) => c.key === connection.connectorKey);
    if (!connector) {
      throw new NotFoundException(`No connector registered for "${connection.connectorKey}"`);
    }

    const credentials = JSON.parse(this.credentialVault.decrypt(connection.credentialsEncrypted));
    const projects = await connector.fetchProjects(credentials, connection.config);
    // Cache-as-you-go: the wizard's "browse projects" step and "Sync Now" share one write path.
    await this.connectionRepository.upsertProjects(query.connectionId, projects);
    return projects;
  }
}
