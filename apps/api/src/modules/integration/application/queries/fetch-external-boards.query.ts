import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import { ExternalBoardPayload, IIntegrationConnector, INTEGRATION_CONNECTORS } from '../ports/integration-connector.port';

// Import wizard step 3.
export class FetchExternalBoardsQuery {
  constructor(
    public readonly organizationId: string,
    public readonly connectionId: string,
    public readonly projectKey: string,
  ) {}
}

@QueryHandler(FetchExternalBoardsQuery)
export class FetchExternalBoardsHandler implements IQueryHandler<FetchExternalBoardsQuery, ExternalBoardPayload[]> {
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    @Inject(INTEGRATION_CONNECTORS) private readonly connectors: IIntegrationConnector[],
  ) {}

  async execute(query: FetchExternalBoardsQuery): Promise<ExternalBoardPayload[]> {
    const connection = await this.connectionRepository.findCredentialsById(query.connectionId, query.organizationId);
    if (!connection) {
      throw new NotFoundException('Integration connection not found');
    }

    const connector = this.connectors.find((c) => c.key === connection.connectorKey);
    if (!connector) {
      throw new NotFoundException(`No connector registered for "${connection.connectorKey}"`);
    }

    const credentials = JSON.parse(this.credentialVault.decrypt(connection.credentialsEncrypted));
    return connector.fetchBoards(query.projectKey, credentials, connection.config);
  }
}
