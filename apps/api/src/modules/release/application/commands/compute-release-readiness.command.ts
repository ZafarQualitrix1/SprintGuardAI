import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AiOrchestrationService } from '../../../ai/application/services/ai-orchestration.service';
import {
  RELEASE_METRICS_READ_REPOSITORY,
  IReleaseMetricsReadRepository,
} from '../../domain/repositories/release-metrics-read.repository.interface';
import {
  RELEASE_REPORT_REPOSITORY,
  IReleaseReportRepository,
} from '../../domain/repositories/release-report.repository.interface';
import { ReleaseReportEntity } from '../../domain/entities/release-report.entity';
import { computeReadinessScore } from '../utils/compute-readiness.util';
import { releaseSummaryOutputSchema } from '../schemas/release-summary.schema';

export class ComputeReleaseReadinessCommand {
  constructor(
    public readonly organizationId: string,
    public readonly sprintId: string,
  ) {}
}

@CommandHandler(ComputeReleaseReadinessCommand)
export class ComputeReleaseReadinessHandler
  implements ICommandHandler<ComputeReleaseReadinessCommand, ReleaseReportEntity>
{
  constructor(
    @Inject(RELEASE_METRICS_READ_REPOSITORY)
    private readonly metricsReadRepository: IReleaseMetricsReadRepository,
    @Inject(RELEASE_REPORT_REPOSITORY) private readonly releaseReportRepository: IReleaseReportRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
  ) {}

  async execute(command: ComputeReleaseReadinessCommand): Promise<ReleaseReportEntity> {
    const ref = await this.metricsReadRepository.findSprintProjectRef(command.sprintId, command.organizationId);
    if (!ref) {
      throw new NotFoundException('Sprint not found');
    }

    const [coverage, execution] = await Promise.all([
      this.metricsReadRepository.getCoverageMetrics(command.sprintId),
      this.metricsReadRepository.getExecutionMetrics(command.sprintId),
    ]);

    const readinessScore = computeReadinessScore(coverage.coveragePercent, execution.executionPassRate);

    // The score itself never depends on the AI call succeeding -- narrative generation is a
    // best-effort enhancement, not a blocking dependency (mirrors the Coverage Guardian Agent's
    // "deterministic core never fails" principle, Solution Architecture §10.2).
    let executiveSummary: string | null = null;
    try {
      // Explicit: capabilities without a provider fall through to the deployment's
      // AI_DEFAULT_PROVIDER env var, which has drifted to an unconfigured provider in Vercel
      // before -- pinning to the one with a real, working key avoids depending on that.
      const result = await this.aiOrchestrationService.execute({
        capability: 'release-readiness-summary',
        agentKey: 'release-guardian-agent',
        organizationId: command.organizationId,
        provider: 'groq',
        variables: {
          readinessScore,
          coveragePercent: coverage.coveragePercent,
          executionPassRate: execution.executionPassRate,
          totalRequirements: coverage.totalRequirements,
          coveredRequirements: coverage.coveredRequirements,
          totalTestCases: execution.totalTestCases,
          passedCount: execution.passedCount,
          failedCount: execution.failedCount,
        },
        outputSchema: releaseSummaryOutputSchema,
      });
      executiveSummary = [result.data.summary, ...result.data.highlights.map((h) => `- ${h}`)].join('\n');
    } catch {
      executiveSummary = null;
    }

    return this.releaseReportRepository.create({
      projectId: ref.projectId,
      sprintId: ref.sprintId,
      readinessScore,
      executiveSummary,
      breakdown: {
        coveragePercent: coverage.coveragePercent,
        executionPassRate: execution.executionPassRate,
        totalTestCases: execution.totalTestCases,
        executedCount: execution.executedCount,
        passedCount: execution.passedCount,
        failedCount: execution.failedCount,
      },
    });
  }
}
