import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AUDIT_LOG_REPOSITORY,
  AuditLogEntry,
  IAuditLogRepository,
  ListAuditLogsFilters,
} from '../../domain/repositories/audit-log.repository.interface';

const CSV_COLUMNS = ['createdAt', 'organizationName', 'actorEmail', 'action', 'targetType', 'targetId', 'ipAddress'] as const;

function toCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(entries: AuditLogEntry[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = entries.map((entry) =>
    CSV_COLUMNS.map((col) => toCsvValue(col === 'createdAt' ? entry.createdAt.toISOString() : entry[col])).join(','),
  );
  return [header, ...rows].join('\n');
}

export class ExportAuditLogsQuery {
  constructor(public readonly filters: ListAuditLogsFilters) {}
}

@QueryHandler(ExportAuditLogsQuery)
export class ExportAuditLogsHandler implements IQueryHandler<ExportAuditLogsQuery, string> {
  constructor(@Inject(AUDIT_LOG_REPOSITORY) private readonly repository: IAuditLogRepository) {}

  async execute(query: ExportAuditLogsQuery): Promise<string> {
    // Bounded at 5000 rows for a single CSV export -- pagination controls exist for browsing
    // beyond that; a true unbounded export/streaming endpoint is a follow-up if this proves
    // insufficient in practice.
    const { items } = await this.repository.list({ ...query.filters, page: 1, pageSize: 5000 });
    return toCsv(items);
  }
}
