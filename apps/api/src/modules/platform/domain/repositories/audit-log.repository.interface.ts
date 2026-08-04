export const AUDIT_LOG_REPOSITORY = Symbol('IAuditLogRepository');

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  organizationName: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: Date;
}

export interface ListAuditLogsFilters {
  organizationId?: string; // undefined + platform-wide caller = all orgs
  actorId?: string;
  action?: string;
  targetType?: string;
  targetId?: string; // narrows to a single entity's history, e.g. one story's BA review audit trail
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

export interface ListAuditLogsResult {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IAuditLogRepository {
  list(filters: ListAuditLogsFilters): Promise<ListAuditLogsResult>;
}
