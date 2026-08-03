import { ExecutionEntity, ExecutionStatus } from '../entities/execution.entity';

export const EXECUTION_REPOSITORY = Symbol('IExecutionRepository');

export interface RecordExecutionInput {
  testCaseId: string;
  sprintId: string;
  status: ExecutionStatus;
  executedBy: string;
  notes?: string;
  evidenceUrl?: string;
  actualResult?: string;
  attachmentUrls?: string[];
  screenshotUrls?: string[];
  defectReference?: string;
  executionDurationMs?: number;
  testerName?: string;
}

export interface IExecutionRepository {
  record(input: RecordExecutionInput): Promise<ExecutionEntity>;
  findBySprintId(sprintId: string): Promise<ExecutionEntity[]>;
}
