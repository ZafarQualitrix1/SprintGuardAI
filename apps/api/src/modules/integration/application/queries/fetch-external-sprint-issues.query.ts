import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import {
  ExternalIssueSummaryPayload,
  IIntegrationConnector,
  INTEGRATION_CONNECTORS,
} from '../ports/integration-connector.port';

// Smart Sprint Import (§2) picker step -- fetched once, used to render the issue checklist and to
// derive the distinct epics/labels/assignees for "Import by Epic/Label/Assignee".
export class FetchExternalSprintIssuesQuery {
  constructor(
    public readonly organizationId: string,
    public readonly connectionId: string,
    public readonly reference: string,
  ) {}
}

@QueryHandler(FetchExternalSprintIssuesQuery)
export class FetchExternalSprintIssuesHandler
  implements IQueryHandler<FetchExternalSprintIssuesQuery, ExternalIssueSummaryPayload[]>
{
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    @Inject(INTEGRATION_CONNECTORS) private readonly connectors: IIntegrationConnector[],
  ) {}

  async execute(query: FetchExternalSprintIssuesQuery): Promise<ExternalIssueSummaryPayload[]> {
    const connection = await this.connectionRepository.findCredentialsById(query.connectionId, query.organizationId);
    if (!connection) {
      throw new NotFoundException('Integration connection not found');
    }

    const connector = this.connectors.find((c) => c.key === connection.connectorKey);
    if (!connector) {
      throw new NotFoundException(`No connector registered for "${connection.connectorKey}"`);
    }

    const credentials = JSON.parse(this.credentialVault.decrypt(connection.credentialsEncrypted));
    return connector.fetchSprintIssuesSummary(query.reference, credentials, connection.config);
  }
}
