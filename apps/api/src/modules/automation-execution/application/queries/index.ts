import { GetAutomationExecutionRunHandler } from './get-automation-execution-run.query';
import { ListAutomationExecutionRunsByStoryHandler } from './list-automation-execution-runs-by-story.query';
import { GetRunAutomationFilesHandler } from './get-run-automation-files.query';

export * from './get-automation-execution-run.query';
export * from './list-automation-execution-runs-by-story.query';
export * from './get-run-automation-files.query';

export const AUTOMATION_EXECUTION_QUERY_HANDLERS = [
  GetAutomationExecutionRunHandler,
  ListAutomationExecutionRunsByStoryHandler,
  GetRunAutomationFilesHandler,
];
