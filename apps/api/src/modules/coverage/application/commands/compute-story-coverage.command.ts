import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AiOrchestrationService } from '../../../ai/application/services/ai-orchestration.service';
import {
  COVERAGE_SOURCE_READ_REPOSITORY,
  ICoverageSourceReadRepository,
} from '../../domain/repositories/coverage-source-read.repository.interface';
import { COVERAGE_REPOSITORY, ICoverageRepository } from '../../domain/repositories/coverage.repository.interface';
import { CoverageRecommendation, StoryCoverageResultEntity } from '../../domain/entities/coverage.entity';
import { deriveStoryCoverage } from '../utils/derive-coverage.util';
import { coverageRecommendationOutputSchema } from '../schemas/coverage-recommendation.schema';

export class ComputeStoryCoverageCommand {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
  ) {}
}

@CommandHandler(ComputeStoryCoverageCommand)
export class ComputeStoryCoverageHandler
  implements ICommandHandler<ComputeStoryCoverageCommand, StoryCoverageResultEntity>
{
  constructor(
    @Inject(COVERAGE_SOURCE_READ_REPOSITORY) private readonly sourceReadRepository: ICoverageSourceReadRepository,
    @Inject(COVERAGE_REPOSITORY) private readonly coverageRepository: ICoverageRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
  ) {}

  async execute(command: ComputeStoryCoverageCommand): Promise<StoryCoverageResultEntity> {
    const source = await this.sourceReadRepository.getStoryCoverageSource(command.storyId, command.organizationId);
    if (!source) {
      throw new NotFoundException('Story not found');
    }

    const { entries, gaps, summary, dimensions, missingTestScenarios, missingAcceptanceCriteria, traceabilityMatrix } =
      deriveStoryCoverage(source);

    // Persisted so Release Readiness's sprint-wide aggregate (which reads CoverageMatrixEntry by
    // sprintId, not per-story) picks up this story's rows -- the same reason ComputeCoverageCommand
    // persists at sprint scope.
    await this.coverageRepository.replaceForStory(source.storyId, source.sprintId, source.projectId, entries, gaps);

    // Best-effort, never persisted -- same "deterministic core never fails" pattern as
    // ComputeCoverageHandler. Reuses the existing coverage-recommendation capability/prompt (its
    // {{sprintName}} slot is just a display label, so a story title fits it without a new prompt).
    let aiRecommendation: CoverageRecommendation | null = null;
    try {
      const gappedRequirementLines = gaps
        .map((gap) => {
          const requirement = source.requirements.find((r) => r.id === gap.requirementId);
          return requirement ? `- "${requirement.text}": ${gap.description}` : null;
        })
        .filter((line): line is string => line !== null);

      const result = await this.aiOrchestrationService.execute({
        capability: 'coverage-recommendation',
        agentKey: 'coverage-agent',
        organizationId: command.organizationId,
        // Explicit: capabilities without a provider fall through to the deployment's
        // AI_DEFAULT_PROVIDER env var, which has drifted to an unconfigured provider in Vercel
        // before -- pinning to the one with a real, working key avoids depending on that.
        provider: 'groq',
        variables: {
          sprintName: `Story: ${source.storyTitle}`,
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

    return new StoryCoverageResultEntity(
      source.storyId,
      source.storyTitle,
      summary,
      dimensions,
      entries.map((entry, index) => ({
        id: `computed-${index}`,
        requirementId: entry.requirementId,
        requirementText: source.requirements.find((r) => r.id === entry.requirementId)?.text ?? '',
        coverageStatus: entry.coverageStatus,
        testCaseId: entry.testCaseId,
      })),
      gaps.map((gap, index) => ({
        id: `computed-${index}`,
        requirementId: gap.requirementId,
        requirementText: source.requirements.find((r) => r.id === gap.requirementId)?.text ?? null,
        gapType: gap.gapType,
        severity: gap.severity,
        description: gap.description,
      })),
      missingTestScenarios,
      missingAcceptanceCriteria,
      traceabilityMatrix,
      aiRecommendation,
      new Date(),
    );
  }
}
