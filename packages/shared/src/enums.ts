// Plain TypeScript mirrors of the Prisma enums (packages/database/prisma/schema.prisma) that the
// frontend needs for labels/badges/filters. Kept here (not re-exported from @prisma/client) so
// apps/web never depends on @prisma/client or the database package.
export enum SprintStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum StoryStatus {
  BACKLOG = 'BACKLOG',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
  BLOCKED = 'BLOCKED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum CoverageStatus {
  COVERED = 'COVERED',
  PARTIALLY_COVERED = 'PARTIALLY_COVERED',
  NOT_COVERED = 'NOT_COVERED',
}

export enum ExecutionStatus {
  NOT_RUN = 'NOT_RUN',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  SKIPPED = 'SKIPPED',
}

export enum ReleaseReportStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PUBLISHED = 'PUBLISHED',
}

export enum AgentRunStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  FLAGGED_FOR_REVIEW = 'FLAGGED_FOR_REVIEW',
}

export enum PromptStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
}
