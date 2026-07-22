import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { IntegrationConnectionEntity } from '../../domain/entities/integration-connection.entity';

export class ListIntegrationConnectionsQuery {
  constructor(public readonly organizationId: string) {}
}

@QueryHandler(ListIntegrationConnectionsQuery)
export class ListIntegrationConnectionsHandler
  implements IQueryHandler<ListIntegrationConnectionsQuery, IntegrationConnectionEntity[]>
{
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
  ) {}

  execute(query: ListIntegrationConnectionsQuery): Promise<IntegrationConnectionEntity[]> {
    return this.connectionRepository.listByOrganization(query.organizationId);
  }
}
