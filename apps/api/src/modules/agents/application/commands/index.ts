// Command handlers (CQRS writes) for the Agents bounded context.
import { SetAgentStatusHandler } from './set-agent-status.command';

export * from './set-agent-status.command';

export const AGENTS_COMMAND_HANDLERS = [SetAgentStatusHandler];
