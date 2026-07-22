import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  CreateReleaseReportInput,
  IReleaseReportRepository,
} from '../../domain/repositories/release-report.repository.interface';
import { toReleaseReportEntity } from '../mappers';

@Injectable()
export class PrismaReleaseReportRepository implements IReleaseReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateReleaseReportInput) {
    const row = await this.prisma.releaseReport.create({
      data: {
        projectId: input.projectId,
        sprintId: input.sprintId,
        readinessScore: input.readinessScore,
        executiveSummary: input.executiveSummary,
        breakdown: input.breakdown as unknown as Prisma.InputJsonValue,
        status: 'PUBLISHED',
      },
    });
    return toReleaseReportEntity(row);
  }

  async findLatestBySprintId(sprintId: string) {
    const row = await this.prisma.releaseReport.findFirst({
      where: { sprintId },
      orderBy: { createdAt: 'desc' },
    });
    return row ? toReleaseReportEntity(row) : null;
  }
}
