// Query handlers (CQRS reads) for the Analytics bounded context.
export * from './get-dashboard-summary.query';

import { GetDashboardSummaryHandler } from './get-dashboard-summary.query';

export const ANALYTICS_QUERY_HANDLERS = [GetDashboardSummaryHandler];
