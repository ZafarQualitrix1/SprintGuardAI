import { ReleaseReportEntity } from '../../domain/entities/release-report.entity';
import { ReleaseReportDto } from '../dto/release-report.dto';

// Shared by the HTTP controller and the worker process's queue processor (which broadcasts this
// same shape over the Release Readiness WebSocket gateway after a real-time recompute).
export function toReleaseReportDto(entity: ReleaseReportEntity): ReleaseReportDto {
  return {
    id: entity.id,
    sprintId: entity.sprintId,
    readinessScore: entity.readinessScore,
    executiveSummary: entity.executiveSummary,
    breakdown: entity.breakdown,
    status: entity.status,
    createdAt: entity.createdAt.toISOString(),
  };
}
