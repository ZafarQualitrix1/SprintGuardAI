import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SPRINT_REPOSITORY, ISprintRepository } from '../../domain/repositories/sprint.repository.interface';
import { SprintSyncEventEntity } from '../../domain/entities/sprint.entity';

// Backs both "View Import History" and "View Synchronization Logs" menu actions -- one event
// stream (see SprintSyncEvent), most recent first.
export class GetSprintSyncHistoryQuery {
  constructor(
    public readonly organizationId: string,
    public readonly sprintId: string,
  ) {}
}

@QueryHandler(GetSprintSyncHistoryQuery)
export class GetSprintSyncHistoryHandler
  implements IQueryHandler<GetSprintSyncHistoryQuery, SprintSyncEventEntity[]>
{
  constructor(@Inject(SPRINT_REPOSITORY) private readonly sprintRepository: ISprintRepository) {}

  execute(query: GetSprintSyncHistoryQuery): Promise<SprintSyncEventEntity[]> {
    return this.sprintRepository.listSyncEvents(query.sprintId, query.organizationId);
  }
}
