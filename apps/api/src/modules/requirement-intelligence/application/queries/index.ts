// Query handlers (CQRS reads) for the RequirementIntelligence bounded context.
export * from './get-requirements-by-story.query';

import { GetRequirementsByStoryHandler } from './get-requirements-by-story.query';

export const REQUIREMENT_INTELLIGENCE_QUERY_HANDLERS = [GetRequirementsByStoryHandler];
