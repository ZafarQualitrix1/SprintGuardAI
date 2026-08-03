// Query handlers (CQRS reads) for the Platform bounded context.
import { ListAuditLogsHandler } from './list-audit-logs.query';
import { ExportAuditLogsHandler } from './export-audit-logs.query';
import { GetAdminDashboardSummaryHandler } from './get-admin-dashboard-summary.query';
import { ListRolesHandler } from './list-roles.query';

export * from './list-audit-logs.query';
export * from './export-audit-logs.query';
export * from './get-admin-dashboard-summary.query';
export * from './list-roles.query';

export const PLATFORM_QUERY_HANDLERS = [
  ListAuditLogsHandler,
  ExportAuditLogsHandler,
  GetAdminDashboardSummaryHandler,
  ListRolesHandler,
];
