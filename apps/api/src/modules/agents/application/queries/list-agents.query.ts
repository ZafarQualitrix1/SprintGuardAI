import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AGENT_MANAGEMENT_REPOSITORY,
  AgentSummary,
  IAgentManagementRepository,
} from '../../domain/repositories/agent-management.repository.interface';

export class ListAgentsQuery {
  constructor(public readonly organizationId: string) {}
}

@QueryHandler(ListAgentsQuery)
export class ListAgentsHandler implements IQueryHandler<ListAgentsQuery, AgentSummary[]> {
  constructor(@Inject(AGENT_MANAGEMENT_REPOSITORY) private readonly repository: IAgentManagementRepository) {}

  execute(query: ListAgentsQuery): Promise<AgentSummary[]> {
    return this.repository.listWithStats(query.organizationId);
  }
}
