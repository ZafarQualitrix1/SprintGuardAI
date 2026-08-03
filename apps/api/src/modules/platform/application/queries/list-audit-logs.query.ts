import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AUDIT_LOG_REPOSITORY,
  IAuditLogRepository,
  ListAuditLogsFilters,
  ListAuditLogsResult,
} from '../../domain/repositories/audit-log.repository.interface';

export class ListAuditLogsQuery {
  constructor(public readonly filters: ListAuditLogsFilters) {}
}

@QueryHandler(ListAuditLogsQuery)
export class ListAuditLogsHandler implements IQueryHandler<ListAuditLogsQuery, ListAuditLogsResult> {
  constructor(@Inject(AUDIT_LOG_REPOSITORY) private readonly repository: IAuditLogRepository) {}

  execute(query: ListAuditLogsQuery): Promise<ListAuditLogsResult> {
    return this.repository.list(query.filters);
  }
}
