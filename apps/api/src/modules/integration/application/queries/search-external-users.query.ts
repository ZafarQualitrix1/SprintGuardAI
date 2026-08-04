import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import { ExternalUserMatch, IIntegrationConnector, INTEGRATION_CONNECTORS } from '../ports/integration-connector.port';

// Multi-result counterpart to ResolveExternalUserQuery -- backs the Submit for Review modal's BA
// mention/CC pickers, where a human chooses among several matches instead of the system
// auto-resolving a single @mention.
export class SearchExternalUsersQuery {
  constructor(
    public readonly organizationId: string,
    public readonly connectionId: string,
    public readonly searchQuery: string,
  ) {}
}

@QueryHandler(SearchExternalUsersQuery)
export class SearchExternalUsersHandler implements IQueryHandler<SearchExternalUsersQuery, ExternalUserMatch[]> {
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    @Inject(INTEGRATION_CONNECTORS) private readonly connectors: IIntegrationConnector[],
  ) {}

  async execute(query: SearchExternalUsersQuery): Promise<ExternalUserMatch[]> {
    const connection = await this.connectionRepository.findCredentialsById(
      query.connectionId,
      query.organizationId,
    );
    if (!connection) {
      throw new NotFoundException('Integration connection not found');
    }

    const connector = this.connectors.find((c) => c.key === connection.connectorKey);
    if (!connector) {
      throw new NotFoundException(`No connector registered for "${connection.connectorKey}"`);
    }

    const credentials = JSON.parse(this.credentialVault.decrypt(connection.credentialsEncrypted));
    return connector.searchUsers(query.searchQuery, credentials, connection.config);
  }
}
