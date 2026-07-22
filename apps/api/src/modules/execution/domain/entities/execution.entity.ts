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
  ) {}
}
