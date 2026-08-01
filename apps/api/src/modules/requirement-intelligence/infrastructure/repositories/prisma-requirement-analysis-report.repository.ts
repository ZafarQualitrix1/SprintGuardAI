import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  CreateRequirementAnalysisReportInput,
  IRequirementAnalysisReportRepository,
} from '../../domain/repositories/requirement-analysis-report.repository.interface';
import { toRequirementAnalysisReportEntity } from '../mappers';

@Injectable()
export class PrismaRequirementAnalysisReportRepository implements IRequirementAnalysisReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createNewVersion(input: CreateRequirementAnalysisReportInput) {
    const { testCases, coverage, ...analysis } = input.output;

    const row = await this.prisma.$transaction(async (tx) => {
      const previous = await tx.requirementAnalysisReport.findFirst({
        where: { storyId: input.storyId, isLatest: true },
        select: { id: true, version: true },
      });

      if (previous) {
        await tx.requirementAnalysisReport.update({
          where: { id: previous.id },
          data: { isLatest: false },
        });
      }

      return tx.requirementAnalysisReport.create({
        data: {
          storyId: input.storyId,
          sprintId: input.sprintId,
          organizationId: input.organizationId,
          aiProvider: input.aiProvider,
          model: input.model,
          promptVersion: input.promptVersion,
          version: (previous?.version ?? 0) + 1,
          isLatest: true,
          generatedBy: input.generatedBy,
          analysisJson: analysis as Prisma.InputJsonValue,
          testCasesJson: testCases as Prisma.InputJsonValue,
          coverageJson: coverage as Prisma.InputJsonValue,
          confidenceScore: input.confidenceScore,
          generatedByAgentRunId: input.generatedByAgentRunId,
          jiraSnapshot: input.jiraSnapshot as Prisma.InputJsonValue,
        },
      });
    });

    return toRequirementAnalysisReportEntity(row);
  }

  async findLatestByStoryId(storyId: string, organizationId: string) {
    const row = await this.prisma.requirementAnalysisReport.findFirst({
      where: { storyId, organizationId, isLatest: true },
    });
    return row ? toRequirementAnalysisReportEntity(row) : null;
  }

  async findHistoryByStoryId(storyId: string, organizationId: string) {
    const rows = await this.prisma.requirementAnalysisReport.findMany({
      where: { storyId, organizationId },
      orderBy: { version: 'desc' },
    });
    return rows.map(toRequirementAnalysisReportEntity);
  }
}
