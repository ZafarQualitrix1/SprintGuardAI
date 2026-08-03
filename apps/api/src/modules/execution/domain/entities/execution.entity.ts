export type ExecutionStatus = 'NOT_RUN' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';

export class ExecutionEntity {
  constructor(
    public readonly id: string,
    public readonly testCaseId: string,
    public readonly testCaseTitle: string,
    public readonly sprintId: string,
    public readonly status: ExecutionStatus,
    public readonly executedBy: string | null,
    public readonly executedAt: Date | null,
    public readonly notes: string | null,
    public readonly evidenceUrl: string | null,
    public readonly actualResult: string | null,
    public readonly attachmentUrls: string[],
    public readonly screenshotUrls: string[],
    public readonly defectReference: string | null,
    public readonly executionDurationMs: number | null,
    public readonly testerName: string | null,
  ) {}
}
