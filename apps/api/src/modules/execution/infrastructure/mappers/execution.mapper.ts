import type { Execution, TestCase } from '@sprintguard/database';
import { ExecutionEntity } from '../../domain/entities/execution.entity';

type ExecutionWithTestCase = Execution & { testCase: TestCase };

export function toExecutionEntity(row: ExecutionWithTestCase): ExecutionEntity {
  return new ExecutionEntity(
    row.id,
    row.testCaseId,
    row.testCase.title,
    row.sprintId,
    row.status,
    row.executedBy,
    row.executedAt,
    row.notes,
    row.evidenceUrl,
    row.actualResult,
    (row.attachmentUrls as unknown as string[] | null) ?? [],
    (row.screenshotUrls as unknown as string[] | null) ?? [],
    row.defectReference,
    row.executionDurationMs,
    row.testerName,
  );
}
