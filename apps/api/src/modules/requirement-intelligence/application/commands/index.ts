// Command handlers (CQRS writes) for the RequirementIntelligence bounded context.
export * from './run-requirement-intelligence-agent.command';

import { RunRequirementIntelligenceAgentHandler } from './run-requirement-intelligence-agent.command';

export const REQUIREMENT_INTELLIGENCE_COMMAND_HANDLERS = [RunRequirementIntelligenceAgentHandler];
