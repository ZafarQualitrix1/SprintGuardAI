import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  CreateAutomationGenerationInput,
  IAutomationGenerationRepository,
} from '../../domain/repositories/automation-generation.repository.interface';
import { toAutomationGenerationEntity } from '../mappers';

@Injectable()
export class PrismaAutomationGenerationRepository implements IAutomationGenerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createNextVersion(input: CreateAutomationGenerationInput) {
    const row = await this.prisma.$transaction(async (tx) => {
      const aggregate = await tx.automationGeneration.aggregate({
        where: { testCaseId: input.testCaseId, automationType: input.automationType },
        _max: { version: true },
      });
      const nextVersion = (aggregate._max.version ?? 0) + 1;

      return tx.automationGeneration.create({
        data: {
          testCaseId: input.testCaseId,
          automationType: input.automationType,
          version: nextVersion,
          frameworkVersion: input.frameworkVersion,
          generatorVersion: input.generatorVersion,
          aiModelVersion: input.aiModelVersion,
          files: input.files as unknown as Prisma.InputJsonValue,
          automationReadinessScore: input.automationReadinessScore,
          estimatedEffortHours: input.estimatedEffortHours,
          complexityLevel: input.complexityLevel,
          requiredPreconditions: input.requiredPreconditions as unknown as Prisma.InputJsonValue,
          missingRequirementDetails: input.missingRequirementDetails as unknown as Prisma.InputJsonValue,
          generatedByAgentRunId: input.generatedByAgentRunId,
          createdBy: input.createdBy,
        },
      });
    });

    return toAutomationGenerationEntity(row);
  }

  async findById(id: string) {
    const row = await this.prisma.automationGeneration.findUnique({ where: { id } });
    return row ? toAutomationGenerationEntity(row) : null;
  }

  async listByTestCaseId(testCaseId: string) {
    const rows = await this.prisma.automationGeneration.findMany({
      where: { testCaseId },
      orderBy: [{ automationType: 'asc' }, { version: 'desc' }],
    });
    return rows.map(toAutomationGenerationEntity);
  }

  async listLatestForTestCaseIds(testCaseIds: string[]) {
    if (testCaseIds.length === 0) return [];

    const rows = await this.prisma.automationGeneration.findMany({
      where: { testCaseId: { in: testCaseIds } },
      orderBy: [{ testCaseId: 'asc' }, { automationType: 'asc' }, { version: 'desc' }],
    });

    const seen = new Set<string>();
    const latest = [];
    for (const row of rows) {
      const key = `${row.testCaseId}:${row.automationType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      latest.push(row);
    }
    return latest.map(toAutomationGenerationEntity);
  }

  async markSaved(id: string) {
    const existing = await this.prisma.automationGeneration.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Automation generation not found');
    }
    const row = await this.prisma.automationGeneration.update({ where: { id }, data: { status: 'SAVED' } });
    return toAutomationGenerationEntity(row);
  }
}
