// Command handlers (CQRS writes) for the RequirementIntelligence bounded context.
export * from './run-requirement-intelligence-agent.command';
export * from './run-deep-requirement-analysis.command';

import { RunRequirementIntelligenceAgentHandler } from './run-requirement-intelligence-agent.command';
import { RunDeepRequirementAnalysisHandler } from './run-deep-requirement-analysis.command';

export const REQUIREMENT_INTELLIGENCE_COMMAND_HANDLERS = [
  RunRequirementIntelligenceAgentHandler,
  RunDeepRequirementAnalysisHandler,
];
