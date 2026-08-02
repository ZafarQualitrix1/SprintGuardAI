import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  CoverageMatrixEntryDraft,
  GapDraft,
  ICoverageRepository,
} from '../../domain/repositories/coverage.repository.interface';
import { CoverageResultEntity, CoverageStatus, GapSeverity, GapType } from '../../domain/entities/coverage.entity';

@Injectable()
export class PrismaCoverageRepository implements ICoverageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceForSprint(
    sprintId: string,
    projectId: string,
    entries: CoverageMatrixEntryDraft[],
    gaps: GapDraft[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.coverageMatrixEntry.deleteMany({ where: { sprintId } }),
      this.prisma.gap.deleteMany({ where: { sprintId } }),
      ...(entries.length > 0
        ? [
            this.prisma.coverageMatrixEntry.createMany({
              data: entries.map((entry) => ({
                projectId,
                sprintId,
                requirementId: entry.requirementId,
                testCaseId: entry.testCaseId,
                coverageStatus: entry.coverageStatus,
              })),
            }),
          ]
        : []),
      ...(gaps.length > 0
        ? [
            this.prisma.gap.createMany({
              data: gaps.map((gap) => ({
                projectId,
                sprintId,
                requirementId: gap.requirementId,
                gapType: gap.gapType,
                severity: gap.severity,
                description: gap.description,
              })),
            }),
          ]
        : []),
    ]);
  }

  async replaceForStory(
    storyId: string,
    sprintId: string,
    projectId: string,
    entries: CoverageMatrixEntryDraft[],
    gaps: GapDraft[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.coverageMatrixEntry.deleteMany({ where: { requirement: { storyId } } }),
      this.prisma.gap.deleteMany({ where: { requirement: { storyId } } }),
      ...(entries.length > 0
        ? [
            this.prisma.coverageMatrixEntry.createMany({
              data: entries.map((entry) => ({
                projectId,
                sprintId,
                requirementId: entry.requirementId,
                testCaseId: entry.testCaseId,
                coverageStatus: entry.coverageStatus,
              })),
            }),
          ]
        : []),
      ...(gaps.length > 0
        ? [
            this.prisma.gap.createMany({
              data: gaps.map((gap) => ({
                projectId,
                sprintId,
                requirementId: gap.requirementId,
                gapType: gap.gapType,
                severity: gap.severity,
                description: gap.description,
              })),
            }),
          ]
        : []),
    ]);
  }

  async findBySprintId(sprintId: string): Promise<CoverageResultEntity | null> {
    const [entryRows, gapRows] = await Promise.all([
      this.prisma.coverageMatrixEntry.findMany({
        where: { sprintId },
        include: { requirement: { select: { text: true } } },
        relationLoadStrategy: 'join',
      }),
      this.prisma.gap.findMany({
        where: { sprintId },
        include: { requirement: { select: { text: true } } },
        relationLoadStrategy: 'join',
      }),
    ]);

    if (entryRows.length === 0 && gapRows.length === 0) {
      return null;
    }

    const entries = entryRows.map((row) => ({
      id: row.id,
      requirementId: row.requirementId,
      requirementText: row.requirement.text,
      coverageStatus: row.coverageStatus as CoverageStatus,
      testCaseId: row.testCaseId,
    }));

    const gaps = gapRows.map((row) => ({
      id: row.id,
      requirementId: row.requirementId,
      requirementText: row.requirement?.text ?? null,
      gapType: row.gapType as GapType,
      severity: row.severity as GapSeverity,
      description: row.description,
    }));

    const coveredCount = entries.filter((e) => e.coverageStatus === 'COVERED').length;
    const partiallyCoveredCount = entries.filter((e) => e.coverageStatus === 'PARTIALLY_COVERED').length;
    const notCoveredCount = entries.filter((e) => e.coverageStatus === 'NOT_COVERED').length;
    const totalRequirements = entries.length;
    // Matches IReleaseMetricsReadRepository.getCoverageMetrics' formula exactly (release module)
    // so this page and Release Readiness never show conflicting numbers for the same sprint.
    const coveragePercent = totalRequirements === 0 ? 0 : Math.round((coveredCount / totalRequirements) * 100);

    return new CoverageResultEntity(
      sprintId,
      { totalRequirements, coveredCount, partiallyCoveredCount, notCoveredCount, coveragePercent },
      entries,
      gaps,
      null,
      entryRows[0]?.computedAt ?? gapRows[0]?.createdAt ?? null,
    );
  }
}
