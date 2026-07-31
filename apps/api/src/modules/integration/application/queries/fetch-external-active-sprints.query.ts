import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import {
  ExternalActiveSprintPayload,
  IIntegrationConnector,
  INTEGRATION_CONNECTORS,
} from '../ports/integration-connector.port';

// Import wizard step 4. Step 5 (the actual import) stays FetchExternalSprintQuery, unchanged.
export class FetchExternalActiveSprintsQuery {
  constructor(
    public readonly organizationId: string,
    public readonly connectionId: string,
    public readonly boardId: string,
  ) {}
}

@QueryHandler(FetchExternalActiveSprintsQuery)
export class FetchExternalActiveSprintsHandler
  implements IQueryHandler<FetchExternalActiveSprintsQuery, ExternalActiveSprintPayload[]>
{
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    @Inject(INTEGRATION_CONNECTORS) private readonly connectors: IIntegrationConnector[],
  ) {}

  async execute(query: FetchExternalActiveSprintsQuery): Promise<ExternalActiveSprintPayload[]> {
    const connection = await this.connectionRepository.findCredentialsById(query.connectionId, query.organizationId);
    if (!connection) {
      throw new NotFoundException('Integration connection not found');
    }

    const connector = this.connectors.find((c) => c.key === connection.connectorKey);
    if (!connector) {
      throw new NotFoundException(`No connector registered for "${connection.connectorKey}"`);
    }

    const credentials = JSON.parse(this.credentialVault.decrypt(connection.credentialsEncrypted));
    return connector.fetchActiveSprints(query.boardId, credentials, connection.config);
  }
}
