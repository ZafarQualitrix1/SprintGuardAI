import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AUDIT_LOG_REPOSITORY,
  AuditLogEntry,
  IAuditLogRepository,
} from '../../../platform/domain/repositories/audit-log.repository.interface';

export class GetAuditTrailQuery {
  constructor(
    public readonly storyId: string,
    public readonly organizationId: string,
  ) {}
}

const AUDIT_TRAIL_PAGE_SIZE = 200;

@QueryHandler(GetAuditTrailQuery)
export class GetAuditTrailHandler implements IQueryHandler<GetAuditTrailQuery, AuditLogEntry[]> {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(query: GetAuditTrailQuery): Promise<AuditLogEntry[]> {
    const { items } = await this.auditLogRepository.list({
      organizationId: query.organizationId,
      targetType: 'Story',
      targetId: query.storyId,
      pageSize: AUDIT_TRAIL_PAGE_SIZE,
    });
    return items;
  }
}
