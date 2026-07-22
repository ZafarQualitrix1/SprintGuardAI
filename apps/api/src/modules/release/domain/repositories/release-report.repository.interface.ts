import { ReleaseReportBreakdown, ReleaseReportEntity } from '../entities/release-report.entity';

export const RELEASE_REPORT_REPOSITORY = Symbol('IReleaseReportRepository');

export interface CreateReleaseReportInput {
  projectId: string;
  sprintId: string;
  readinessScore: number;
  executiveSummary: string | null;
  breakdown: ReleaseReportBreakdown;
}

export interface IReleaseReportRepository {
  /** Each computation is a new row -- release readiness history is append-only (Solution Architecture §2). */
  create(input: CreateReleaseReportInput): Promise<ReleaseReportEntity>;
  findLatestBySprintId(sprintId: string): Promise<ReleaseReportEntity | null>;
}
