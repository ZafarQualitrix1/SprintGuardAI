import { TriggerAutomationExecutionHandler } from './trigger-automation-execution.command';
import { ReceiveExecutionCallbackHandler } from './receive-execution-callback.command';
import { CancelAutomationExecutionHandler } from './cancel-automation-execution.command';

export * from './trigger-automation-execution.command';
export * from './receive-execution-callback.command';
export * from './cancel-automation-execution.command';

export const AUTOMATION_EXECUTION_COMMAND_HANDLERS = [
  TriggerAutomationExecutionHandler,
  ReceiveExecutionCallbackHandler,
  CancelAutomationExecutionHandler,
];
