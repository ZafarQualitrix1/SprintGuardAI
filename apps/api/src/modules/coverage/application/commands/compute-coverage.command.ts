import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AiOrchestrationService } from '../../../ai/application/services/ai-orchestration.service';
import {
  COVERAGE_SOURCE_READ_REPOSITORY,
  ICoverageSourceReadRepository,
} from '../../domain/repositories/coverage-source-read.repository.interface';
import { COVERAGE_REPOSITORY, ICoverageRepository } from '../../domain/repositories/coverage.repository.interface';
import { CoverageRecommendation, CoverageResultEntity } from '../../domain/entities/coverage.entity';
import { deriveCoverage } from '../utils/derive-coverage.util';
import { coverageRecommendationOutputSchema } from '../schemas/coverage-recommendation.schema';
import { ReleaseMetricsChangedEvent } from '../../../release/domain/events/release-metrics-changed.event';

export class ComputeCoverageCommand {
  constructor(
    public readonly organizationId: string,
    public readonly sprintId: string,
  ) {}
}

@CommandHandler(ComputeCoverageCommand)
export class ComputeCoverageHandler implements ICommandHandler<ComputeCoverageCommand, CoverageResultEntity> {
  constructor(
    @Inject(COVERAGE_SOURCE_READ_REPOSITORY) private readonly sourceReadRepository: ICoverageSourceReadRepository,
    @Inject(COVERAGE_REPOSITORY) private readonly coverageRepository: ICoverageRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ComputeCoverageCommand): Promise<CoverageResultEntity> {
    const source = await this.sourceReadRepository.getSprintCoverageSource(command.sprintId, command.organizationId);
    if (!source) {
      throw new NotFoundException('Sprint not found');
    }

    const { entries, gaps, summary } = deriveCoverage(source);
    await this.coverageRepository.replaceForSprint(source.sprintId, source.projectId, entries, gaps);
    this.eventBus.publish(
      new ReleaseMetricsChangedEvent(command.organizationId, source.sprintId, 'coverage-recomputed'),
    );

    // AI recommendations are best-effort and never block the deterministic matrix/gaps/percent --
    // mirrors the Release Guardian Agent's "deterministic core never fails" pattern
    // (compute-release-readiness.command.ts). Not persisted anywhere (no CoverageReport-style
    // table exists), so this is only ever populated on the response returned directly from this
    // command -- a subsequent GET won't show it (see CoverageResultEntity's comment).
    let aiRecommendation: CoverageRecommendation | null = null;
    try {
      const gappedRequirementLines = gaps
        .map((gap) => {
          const requirement = source.requirements.find((r) => r.id === gap.requirementId);
          return requirement ? `- "${requirement.text}": ${gap.description}` : null;
        })
        .filter((line): line is string => line !== null);

      // Explicit: capabilities without a provider fall through to the deployment's
      // AI_DEFAULT_PROVIDER env var, which has drifted to an unconfigured provider in Vercel
      // before -- pinning to the one with a real, working key avoids depending on that.
      const result = await this.aiOrchestrationService.execute({
        capability: 'coverage-recommendation',
        agentKey: 'coverage-agent',
        organizationId: command.organizationId,
        provider: 'groq',
        variables: {
          sprintName: source.sprintName,
          coveragePercent: summary.coveragePercent,
          coveredCount: summary.coveredCount,
          totalRequirements: summary.totalRequirements,
          partiallyCoveredCount: summary.partiallyCoveredCount,
          notCoveredCount: summary.notCoveredCount,
          uncoveredRequirementsList:
            gappedRequirementLines.length > 0 ? gappedRequirementLines.join('\n') : 'None -- full coverage.',
          existingTestTitles:
            source.existingTestCaseTitles.length > 0 ? source.existingTestCaseTitles.join(', ') : 'None yet.',
        },
        outputSchema: coverageRecommendationOutputSchema,
      });
      aiRecommendation = result.data;
    } catch {
      aiRecommendation = null;
    }

    const persisted = await this.coverageRepository.findBySprintId(source.sprintId);
    if (!persisted) {
      // Unreachable in practice -- we just wrote these rows in this same request -- but keeps the
      // return type honest without a non-null assertion.
      throw new NotFoundException('Coverage not found after compute');
    }
    return new CoverageResultEntity(
      persisted.sprintId,
      persisted.summary,
      persisted.entries,
      persisted.gaps,
      aiRecommendation,
      new Date(),
    );
  }
}
