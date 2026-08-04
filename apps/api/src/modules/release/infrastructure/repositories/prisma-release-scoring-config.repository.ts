import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService, ReleaseScoringConfig } from '@sprintguard/database';
import { ReleaseScoringConfigEntity } from '../../domain/entities/release-scoring-config.entity';
import {
  IReleaseScoringConfigRepository,
  UpsertReleaseScoringConfigInput,
} from '../../domain/repositories/release-scoring-config.repository.interface';

function toEntity(row: ReleaseScoringConfig): ReleaseScoringConfigEntity {
  return {
    projectId: row.projectId,
    requirementCoverageWeight: row.requirementCoverageWeight,
    testCaseCoverageWeight: row.testCaseCoverageWeight,
    manualExecutionWeight: row.manualExecutionWeight,
    automationExecutionWeight: row.automationExecutionWeight,
    bugRiskWeight: row.bugRiskWeight,
    severityDeductions: row.severityDeductions as unknown as ReleaseScoringConfigEntity['severityDeductions'],
    manualPassRateBlockThreshold: row.manualPassRateBlockThreshold,
    automationCoverageWarnThreshold: row.automationCoverageWarnThreshold,
  };
}

@Injectable()
export class PrismaReleaseScoringConfigRepository implements IReleaseScoringConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProjectId(projectId: string): Promise<ReleaseScoringConfigEntity | null> {
    const row = await this.prisma.releaseScoringConfig.findUnique({ where: { projectId } });
    return row ? toEntity(row) : null;
  }

  async upsert(input: UpsertReleaseScoringConfigInput): Promise<ReleaseScoringConfigEntity> {
    const data = {
      requirementCoverageWeight: input.requirementCoverageWeight,
      testCaseCoverageWeight: input.testCaseCoverageWeight,
      manualExecutionWeight: input.manualExecutionWeight,
      automationExecutionWeight: input.automationExecutionWeight,
      bugRiskWeight: input.bugRiskWeight,
      severityDeductions: input.severityDeductions as unknown as Prisma.InputJsonValue,
      manualPassRateBlockThreshold: input.manualPassRateBlockThreshold,
      automationCoverageWarnThreshold: input.automationCoverageWarnThreshold,
    };
    const row = await this.prisma.releaseScoringConfig.upsert({
      where: { projectId: input.projectId },
      create: { projectId: input.projectId, ...data },
      update: data,
    });
    return toEntity(row);
  }
}
