import type { ReleaseReport } from '@sprintguard/database';
import { ReleaseReportBreakdown, ReleaseReportEntity } from '../../domain/entities/release-report.entity';

export function toReleaseReportEntity(row: ReleaseReport): ReleaseReportEntity {
  return new ReleaseReportEntity(
    row.id,
    row.projectId,
    row.sprintId,
    row.readinessScore,
    row.executiveSummary,
    row.breakdown as unknown as ReleaseReportBreakdown,
    row.status,
    row.createdAt,
  );
}
