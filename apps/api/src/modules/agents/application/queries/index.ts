// Query handlers (CQRS reads) for the Agents bounded context.
import { ListAgentsHandler } from './list-agents.query';

export * from './list-agents.query';

export const AGENTS_QUERY_HANDLERS = [ListAgentsHandler];
