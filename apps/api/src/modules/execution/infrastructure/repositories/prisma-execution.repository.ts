import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  IExecutionRepository,
  RecordExecutionInput,
} from '../../domain/repositories/execution.repository.interface';
import { toExecutionEntity } from '../mappers';

@Injectable()
export class PrismaExecutionRepository implements IExecutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordExecutionInput) {
    const row = await this.prisma.execution.create({
      data: {
        testCaseId: input.testCaseId,
        sprintId: input.sprintId,
        status: input.status,
        executedBy: input.executedBy,
        executedAt: new Date(),
        notes: input.notes,
        evidenceUrl: input.evidenceUrl,
      },
      include: { testCase: true },
    });
    return toExecutionEntity(row);
  }

  async findBySprintId(sprintId: string) {
    const rows = await this.prisma.execution.findMany({
      where: { sprintId },
      include: { testCase: true },
      orderBy: { executedAt: 'desc' },
    });
    return rows.map(toExecutionEntity);
  }
}
