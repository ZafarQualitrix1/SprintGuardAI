// Query handlers (CQRS reads) for the TestIntelligence bounded context.
export * from './get-test-scenarios-by-story.query';

import { GetTestScenariosByStoryHandler } from './get-test-scenarios-by-story.query';

export const TEST_INTELLIGENCE_QUERY_HANDLERS = [GetTestScenariosByStoryHandler];
