// Query handlers (CQRS reads) for the AiOps bounded context.
import { GetAiUsageSummaryHandler } from './get-ai-usage-summary.query';
import { GetAiCostSummaryHandler } from './get-ai-cost-summary.query';
import { ListAiLogsHandler } from './list-ai-logs.query';

export * from './get-ai-usage-summary.query';
export * from './get-ai-cost-summary.query';
export * from './list-ai-logs.query';

export const AI_OPS_QUERY_HANDLERS = [GetAiUsageSummaryHandler, GetAiCostSummaryHandler, ListAiLogsHandler];
