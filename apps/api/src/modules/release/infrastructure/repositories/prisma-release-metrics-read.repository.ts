import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { IReleaseMetricsReadRepository } from '../../domain/repositories/release-metrics-read.repository.interface';

@Injectable()
export class PrismaReleaseMetricsReadRepository implements IReleaseMetricsReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSprintProjectRef(sprintId: string, organizationId: string) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, project: { organizationId } },
      select: { id: true, projectId: true },
    });
    return sprint ? { sprintId: sprint.id, projectId: sprint.projectId } : null;
  }

  async getCoverageMetrics(sprintId: string) {
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

  async getExecutionMetrics(sprintId: string) {
    const [totalTestCases, executions] = await Promise.all([
      this.prisma.testCase.count({ where: { testScenario: { story: { sprintId } } } }),
      this.prisma.execution.findMany({ where: { sprintId }, select: { status: true } }),
    ]);

    const executedCount = executions.length;
    const passedCount = executions.filter((e) => e.status === 'PASSED').length;
    const failedCount = executions.filter((e) => e.status === 'FAILED').length;
    // Unexecuted test cases count against readiness -- a conservative pass rate relative to the
    // full test case population, not just the subset that has been run so far.
    const executionPassRate = totalTestCases === 0 ? 0 : Math.round((passedCount / totalTestCases) * 100);

    return { totalTestCases, executedCount, passedCount, failedCount, executionPassRate };
  }
}
