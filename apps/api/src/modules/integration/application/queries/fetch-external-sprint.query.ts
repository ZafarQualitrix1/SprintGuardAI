import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import {
  ExternalSprintPayload,
  IIntegrationConnector,
  INTEGRATION_CONNECTORS,
} from '../ports/integration-connector.port';

// Cross-module port (Solution Architecture §7): the `sprint` module's ImportSprintFromIntegration
// command depends on this query via the (globally available) QueryBus rather than importing
// anything from `integration`'s Infrastructure directly -- the two bounded contexts stay decoupled.
export class FetchExternalSprintQuery {
  constructor(
    public readonly organizationId: string,
    public readonly connectionId: string,
    public readonly reference: string,
  ) {}
}

@QueryHandler(FetchExternalSprintQuery)
export class FetchExternalSprintHandler
  implements IQueryHandler<FetchExternalSprintQuery, ExternalSprintPayload>
{
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    @Inject(INTEGRATION_CONNECTORS) private readonly connectors: IIntegrationConnector[],
  ) {}

  async execute(query: FetchExternalSprintQuery): Promise<ExternalSprintPayload> {
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
    return connector.fetchSprint(query.reference, credentials, connection.config);
  }
}
