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
import {
  RELEASE_SCORING_CONFIG_REPOSITORY,
  IReleaseScoringConfigRepository,
} from '../../domain/repositories/release-scoring-config.repository.interface';
import { DEFAULT_RELEASE_SCORING_CONFIG } from '../../domain/entities/release-scoring-config.entity';
import { ReleaseReportEntity } from '../../domain/entities/release-report.entity';
import { computeReleaseReadiness } from '../utils/compute-readiness.util';
import { generateFallbackSummary } from '../utils/generate-fallback-summary.util';
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
    @Inject(RELEASE_SCORING_CONFIG_REPOSITORY)
    private readonly scoringConfigRepository: IReleaseScoringConfigRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
  ) {}

  async execute(command: ComputeReleaseReadinessCommand): Promise<ReleaseReportEntity> {
    const ref = await this.metricsReadRepository.findSprintProjectRef(command.sprintId, command.organizationId);
    if (!ref) {
      throw new NotFoundException('Sprint not found');
    }

    const [requirementCoverage, testCaseCoverage, manualExecution, automationExecution, bugRisk, gates, savedConfig] =
      await Promise.all([
        this.metricsReadRepository.getRequirementCoverageMetrics(command.sprintId),
        this.metricsReadRepository.getTestCaseCoverageMetrics(command.sprintId),
        this.metricsReadRepository.getManualExecutionMetrics(command.sprintId),
        this.metricsReadRepository.getAutomationExecutionMetrics(command.sprintId),
        this.metricsReadRepository.getBugRiskMetrics(command.sprintId),
        this.metricsReadRepository.getSprintGates(command.sprintId),
        this.scoringConfigRepository.findByProjectId(ref.projectId),
      ]);

    const config = savedConfig ?? { projectId: ref.projectId, ...DEFAULT_RELEASE_SCORING_CONFIG };

    const { readinessScore, breakdown } = computeReleaseReadiness({
      requirementCoverage,
      testCaseCoverage,
      manualExecution,
      automationExecution,
      bugRisk,
      gates,
      config,
    });

    // The score itself never depends on the AI call succeeding -- narrative generation is a
    // best-effort enhancement, not a blocking dependency (mirrors the Coverage Guardian Agent's
    // "deterministic core never fails" principle, Solution Architecture §10.2). A deterministic,
    // rule-based summary fills in whenever the AI call is unavailable so the page never shows a
    // bare "no summary" message.
    let executiveSummary: string;
    try {
      const result = await this.aiOrchestrationService.execute({
        capability: 'release-readiness-summary',
        agentKey: 'release-guardian-agent',
        organizationId: command.organizationId,
        provider: 'groq',
        variables: {
          readinessScore,
          releaseStatus: breakdown.releaseStatus,
          riskCategory: breakdown.riskCategory,
          deploymentProbability: breakdown.deploymentProbability,
          requirementCoveragePercent: breakdown.requirementCoveragePercent,
          testCaseCoveragePercent: breakdown.testCaseCoveragePercent,
          manualPassRate: breakdown.manualPassRate,
          automationPassRate: breakdown.automationPassRate,
          openBlockerCount: breakdown.bugRisk.openCounts.BLOCKER,
          openCriticalCount: breakdown.bugRisk.openCounts.CRITICAL,
          openHighCount: breakdown.bugRisk.openCounts.HIGH,
          openMajorCount: breakdown.bugRisk.openCounts.MAJOR,
          openOtherCount:
            breakdown.bugRisk.openCounts.MEDIUM + breakdown.bugRisk.openCounts.MINOR + breakdown.bugRisk.openCounts.TRIVIAL,
          regressionCompleted: breakdown.regressionCompleted,
          deploymentChecklistComplete: breakdown.deploymentChecklistComplete,
          mandatoryFlags: breakdown.mandatoryFlags.map((f) => f.message),
        },
        outputSchema: releaseSummaryOutputSchema,
      });
      executiveSummary = [result.data.summary, ...result.data.highlights.map((h) => `- ${h}`)].join('\n');
    } catch {
      executiveSummary = generateFallbackSummary(ref.sprintName, readinessScore, breakdown);
    }

    return this.releaseReportRepository.create({
      projectId: ref.projectId,
      sprintId: ref.sprintId,
      readinessScore,
      executiveSummary,
      breakdown,
    });
  }
}
