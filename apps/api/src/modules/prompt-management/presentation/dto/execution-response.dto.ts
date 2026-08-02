import { ExecutionRow } from '../../domain/repositories/prompt-execution-read.repository.interface';

export interface ExecutionRowResponseDto extends Omit<ExecutionRow, 'timestamp'> {
  timestamp: string;
}

export function toExecutionRowResponseDto(row: ExecutionRow): ExecutionRowResponseDto {
  return { ...row, timestamp: row.timestamp.toISOString() };
}
