import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
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
        actualResult: input.actualResult,
        attachmentUrls: (input.attachmentUrls ?? undefined) as unknown as Prisma.InputJsonValue,
        screenshotUrls: (input.screenshotUrls ?? undefined) as unknown as Prisma.InputJsonValue,
        defectReference: input.defectReference,
        executionDurationMs: input.executionDurationMs,
        testerName: input.testerName,
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

  async findByStoryId(storyId: string) {
    const rows = await this.prisma.execution.findMany({
      where: { testCase: { testScenario: { storyId } } },
      include: { testCase: true },
      orderBy: { executedAt: 'desc' },
    });
    return rows.map(toExecutionEntity);
  }
}
