// Query handlers (CQRS reads) for the RequirementIntelligence bounded context.
export * from './get-requirements-by-story.query';
export * from './get-requirement-analysis-report.query';
export * from './get-requirement-analysis-history.query';

import { GetRequirementsByStoryHandler } from './get-requirements-by-story.query';
import { GetRequirementAnalysisReportHandler } from './get-requirement-analysis-report.query';
import { GetRequirementAnalysisHistoryHandler } from './get-requirement-analysis-history.query';

export const REQUIREMENT_INTELLIGENCE_QUERY_HANDLERS = [
  GetRequirementsByStoryHandler,
  GetRequirementAnalysisReportHandler,
  GetRequirementAnalysisHistoryHandler,
];
