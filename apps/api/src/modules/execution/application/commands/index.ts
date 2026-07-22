// Command handlers (CQRS writes) for the Execution bounded context.
export * from './record-execution.command';

import { RecordExecutionHandler } from './record-execution.command';

export const EXECUTION_COMMAND_HANDLERS = [RecordExecutionHandler];
