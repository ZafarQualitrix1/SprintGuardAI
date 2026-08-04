import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { DEFECT_SEVERITIES, DefectSeverityLevel } from '../../domain/entities/release-report.entity';
import {
  AutomationExecutionMetrics,
  BugRiskMetrics,
  IReleaseMetricsReadRepository,
  ManualExecutionMetrics,
  RequirementCoverageMetrics,
  SprintGates,
  TestCaseCoverageMetrics,
} from '../../domain/repositories/release-metrics-read.repository.interface';

function emptySeverityCounts(): Record<DefectSeverityLevel, number> {
  return DEFECT_SEVERITIES.reduce(
    (acc, severity) => ({ ...acc, [severity]: 0 }),
    {} as Record<DefectSeverityLevel, number>,
  );
}

@Injectable()
export class PrismaReleaseMetricsReadRepository implements IReleaseMetricsReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSprintProjectRef(sprintId: string, organizationId: string) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, project: { organizationId } },
      select: { id: true, projectId: true, name: true },
    });
    return sprint ? { sprintId: sprint.id, projectId: sprint.projectId, sprintName: sprint.name } : null;
  }

  async getSprintGates(sprintId: string): Promise<SprintGates> {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { regressionCompleted: true, deploymentChecklistComplete: true },
    });
    return {
      regressionCompleted: sprint?.regressionCompleted ?? false,
      deploymentChecklistComplete: sprint?.deploymentChecklistComplete ?? false,
    };
  }

  async getRequirementCoverageMetrics(sprintId: string): Promise<RequirementCoverageMetrics> {
    const entries = await this.prisma.coverageMatrixEntry.findMany({
      where: { sprintId },
      select: { coverageStatus: true },
    });
    const totalRequirements = entries.length;
    const coveredRequirements = entries.filter((e) => e.coverageStatus === 'COVERED').length;
    const coveragePercent =
      totalRequirements === 0 ? 0 : Math.round((coveredRequirements / totalRequirements) * 100);

    return { totalRequirements, coveredRequirements, coveragePercent };
  }

  async getTestCaseCoverageMetrics(sprintId: string): Promise<TestCaseCoverageMetrics> {
    const [totalTestCases, approvedTestCases] = await Promise.all([
      this.prisma.testCase.count({ where: { testScenario: { story: { sprintId } } } }),
      this.prisma.testCase.count({
        where: { testScenario: { story: { sprintId, baReviewState: { status: 'APPROVED' } } } },
      }),
    ]);
    const coveragePercent = totalTestCases === 0 ? 0 : Math.round((approvedTestCases / totalTestCases) * 100);

    return { totalTestCases, approvedTestCases, coveragePercent };
  }

  async getManualExecutionMetrics(sprintId: string): Promise<ManualExecutionMetrics> {
    const [totalTestCases, executions] = await Promise.all([
      this.prisma.testCase.count({ where: { testScenario: { story: { sprintId } } } }),
      this.prisma.execution.findMany({
        where: { sprintId },
        select: { testCaseId: true, status: true, executedAt: true, createdAt: true },
        orderBy: [{ executedAt: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    // Executions are append-only (every record is a new row, e.g. a rerun after a fix) -- only the
    // most recent attempt per test case reflects its current true status.
    const latestByTestCase = new Map<string, (typeof executions)[number]>();
    for (const execution of executions) {
      if (!latestByTestCase.has(execution.testCaseId)) {
        latestByTestCase.set(execution.testCaseId, execution);
      }
    }

    const latest = [...latestByTestCase.values()];
    const executedCount = latest.length;
    const passedCount = latest.filter((e) => e.status === 'PASSED').length;
    const failedCount = latest.filter((e) => e.status === 'FAILED').length;
    const pendingCount = Math.max(0, totalTestCases - executedCount);
    const passRate = executedCount === 0 ? 0 : Math.round((passedCount / executedCount) * 100);

    return { totalTestCases, executedCount, passedCount, failedCount, pendingCount, passRate };
  }

  async getAutomationExecutionMetrics(sprintId: string): Promise<AutomationExecutionMetrics> {
    const stories = await this.prisma.story.findMany({ where: { sprintId }, select: { id: true } });
    const storyIds = stories.map((s) => s.id);
    if (storyIds.length === 0) {
      return { executedCount: 0, passedCount: 0, failedCount: 0, passRate: 0 };
    }

    const runs = await this.prisma.automationExecutionRun.findMany({
      where: { storyId: { in: storyIds } },
      select: { automationGenerationId: true, status: true, completedAt: true, createdAt: true },
      orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
    });

    // Take only the latest run per automation generation so reruns don't get double-counted.
    const latestByGeneration = new Map<string, (typeof runs)[number]>();
    for (const run of runs) {
      if (!latestByGeneration.has(run.automationGenerationId)) {
        latestByGeneration.set(run.automationGenerationId, run);
      }
    }

    const latest = [...latestByGeneration.values()];
    const passedCount = latest.filter((r) => r.status === 'PASSED').length;
    const failedCount = latest.filter((r) => r.status === 'FAILED' || r.status === 'ERROR').length;
    const executedCount = passedCount + failedCount;
    const passRate = executedCount === 0 ? 0 : Math.round((passedCount / executedCount) * 100);

    return { executedCount, passedCount, failedCount, passRate };
  }

  async getBugRiskMetrics(sprintId: string): Promise<BugRiskMetrics> {
    const defects = await this.prisma.defect.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        OR: [{ story: { sprintId } }, { execution: { sprintId } }],
      },
      select: { severity: true },
    });

    const openCounts = emptySeverityCounts();
    for (const defect of defects) {
      openCounts[defect.severity as DefectSeverityLevel] += 1;
    }

    return { openCounts };
  }
}
