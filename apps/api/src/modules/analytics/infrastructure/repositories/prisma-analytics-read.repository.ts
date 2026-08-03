import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  DashboardSummaryResult,
  IAnalyticsReadRepository,
  VelocityPoint,
} from '../../domain/repositories/analytics-read.repository.interface';

const VELOCITY_TREND_SPRINT_COUNT = 10;
// No code path writes RiskAssessment rows yet (no Risk Assessment agent exists) -- this genuinely
// returns 0 today rather than a fake number, and will start reflecting real data the moment that
// feature ships, with no change needed here.
const OPEN_RISK_SCORE_THRESHOLD = 60;

const STORY_STATUSES = ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const;
const EXECUTION_STATUSES = ['NOT_RUN', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'] as const;

@Injectable()
export class PrismaAnalyticsReadRepository implements IAnalyticsReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(organizationId: string): Promise<DashboardSummaryResult> {
    const [
      projectsCount,
      activeSprintsCount,
      coverageEntries,
      releaseReports,
      openRisksCount,
      recentSprints,
      totalTestCases,
      openDefectsCount,
      storyStatusGroups,
      executionStatusGroups,
    ] = await Promise.all([
      this.prisma.project.count({ where: { organizationId } }),
      this.prisma.sprint.count({ where: { project: { organizationId }, status: 'ACTIVE' } }),
      this.prisma.coverageMatrixEntry.findMany({
        where: { project: { organizationId } },
        select: { sprintId: true, coverageStatus: true },
      }),
      this.prisma.releaseReport.findMany({
        where: { project: { organizationId } },
        select: { sprintId: true, readinessScore: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.riskAssessment.count({
        where: { sprint: { project: { organizationId } }, riskScore: { gte: OPEN_RISK_SCORE_THRESHOLD } },
      }),
      this.prisma.sprint.findMany({
        where: { project: { organizationId } },
        select: {
          id: true,
          name: true,
          startDate: true,
          createdAt: true,
          project: { select: { key: true } },
          stories: { select: { storyPoints: true, status: true } },
        },
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        take: VELOCITY_TREND_SPRINT_COUNT,
      }),
      this.prisma.testCase.count({
        where: { testScenario: { story: { sprint: { project: { organizationId } } } } },
      }),
      this.prisma.defect.count({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          OR: [
            { story: { sprint: { project: { organizationId } } } },
            { execution: { sprint: { project: { organizationId } } } },
          ],
        },
      }),
      this.prisma.story.groupBy({
        by: ['status'],
        where: { sprint: { project: { organizationId } } },
        _count: { _all: true },
      }),
      this.prisma.execution.groupBy({
        by: ['status'],
        where: { sprint: { project: { organizationId } } },
        _count: { _all: true },
      }),
    ]);

    const avgCoveragePercent = this.averageCoveragePercent(coverageEntries);
    const releaseReadinessPercent = this.averageLatestReadiness(releaseReports);
    const velocityTrend = this.buildVelocityTrend(recentSprints);

    return {
      projectsCount,
      activeSprintsCount,
      avgCoveragePercent,
      openRisksCount,
      releaseReadinessPercent,
      velocityTrend,
      totalTestCases,
      openDefectsCount,
      storyStatusBreakdown: this.toBreakdown(STORY_STATUSES, storyStatusGroups),
      executionStatusBreakdown: this.toBreakdown(EXECUTION_STATUSES, executionStatusGroups),
    };
  }

  private toBreakdown<T extends string>(
    statuses: readonly T[],
    groups: { status: T; _count: { _all: number } }[],
  ): Record<T, number> {
    const counts = new Map(groups.map((g) => [g.status, g._count._all]));
    return Object.fromEntries(statuses.map((status) => [status, counts.get(status) ?? 0])) as Record<T, number>;
  }

  private averageCoveragePercent(entries: { sprintId: string; coverageStatus: string }[]): number | null {
    if (entries.length === 0) {
      return null;
    }
    const bySprintId = new Map<string, { covered: number; total: number }>();
    for (const entry of entries) {
      const bucket = bySprintId.get(entry.sprintId) ?? { covered: 0, total: 0 };
      bucket.total += 1;
      if (entry.coverageStatus === 'COVERED') {
        bucket.covered += 1;
      }
      bySprintId.set(entry.sprintId, bucket);
    }
    // Matches CoverageMatrixEntry's own coveragePercent formula exactly (coverage module) so this
    // dashboard-level average never disagrees with any single sprint's own Coverage page.
    const perSprintPercents = [...bySprintId.values()].map((b) => (b.total === 0 ? 0 : (b.covered / b.total) * 100));
    const sum = perSprintPercents.reduce((acc, p) => acc + p, 0);
    return Math.round(sum / perSprintPercents.length);
  }

  private averageLatestReadiness(reports: { sprintId: string; readinessScore: number; createdAt: Date }[]): number | null {
    if (reports.length === 0) {
      return null;
    }
    // Input is already ordered by createdAt desc, so the first occurrence per sprintId is latest.
    const latestBySprintId = new Map<string, number>();
    for (const report of reports) {
      if (!latestBySprintId.has(report.sprintId)) {
        latestBySprintId.set(report.sprintId, report.readinessScore);
      }
    }
    const scores = [...latestBySprintId.values()];
    const sum = scores.reduce((acc, s) => acc + s, 0);
    return Math.round(sum / scores.length);
  }

  private buildVelocityTrend(
    sprints: {
      id: string;
      name: string;
      startDate: Date | null;
      project: { key: string };
      stories: { storyPoints: number | null; status: string }[];
    }[],
  ): VelocityPoint[] {
    // Two different Jira boards can each have a sprint literally named "Sprint 0" -- prefix with
    // the project key so the chart never shows ambiguous duplicate labels for genuinely different
    // sprints (Solution note: this was silently broken before, showing identical x-axis labels).
    return [...sprints].reverse().map((sprint) => ({
      sprintName: `${sprint.project.key} · ${sprint.name}`,
      pointsCompleted: sprint.stories
        .filter((story) => story.status === 'DONE')
        .reduce((sum, story) => sum + (story.storyPoints ?? 0), 0),
    }));
  }
}
