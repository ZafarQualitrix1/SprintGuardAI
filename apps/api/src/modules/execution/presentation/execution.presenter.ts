import { ExecutionEntity } from '../domain/entities/execution.entity';
import { ExecutionDto } from './dto/execution.dto';

export function toExecutionDto(entity: ExecutionEntity): ExecutionDto {
  return {
    id: entity.id,
    testCaseId: entity.testCaseId,
    testCaseTitle: entity.testCaseTitle,
    status: entity.status,
    executedBy: entity.executedBy,
    executedAt: entity.executedAt?.toISOString() ?? null,
    notes: entity.notes,
    evidenceUrl: entity.evidenceUrl,
  };
}
