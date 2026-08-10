import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AiOrchestrationService, CAPABILITY_PROVIDER_PINS } from '../../../ai/application/services/ai-orchestration.service';
import {
  STORY_BA_REVIEW_STATE_REPOSITORY,
  IStoryBaReviewStateRepository,
} from '../../domain/repositories/story-ba-review-state.repository.interface';
import {
  BA_REVIEW_CYCLE_REPOSITORY,
  IBaReviewCycleRepository,
} from '../../domain/repositories/ba-review-cycle.repository.interface';
import {
  STORY_CONTEXT_READ_REPOSITORY,
  IStoryContextReadRepository,
} from '../../domain/repositories/story-context-read.repository.interface';
import { TestCaseDistribution } from '../../domain/entities/ba-review-cycle.entity';
import { submissionSummaryOutputSchema } from '../schemas/submission-summary.schema';

export class GetSubmissionDraftQuery {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
  ) {}
}

function formatDistribution(distribution: TestCaseDistribution): string {
  const parts = Object.entries(distribution).filter(([, count]) => count > 0);
  return parts.length > 0 ? parts.map(([type, count]) => `${type}: ${count}`).join(', ') : 'None';
}

function fallbackSummary(input: {
  storyTitle: string;
  documentVersionLabel: string;
  totalScenarios: number;
  totalTestCases: number;
  distributionSummary: string;
  coveragePercent: number | null;
  automationReadinessPercent: number | null;
}): string {
  const coverage = input.coveragePercent !== null ? `${input.coveragePercent.toFixed(1)}%` : 'not yet computed';
  const automation =
    input.automationReadinessPercent !== null ? `${input.automationReadinessPercent.toFixed(1)}%` : 'not yet computed';
  return (
    `SprintGuard AI has generated ${input.documentVersionLabel} of the test cases for "${input.storyTitle}": ` +
    `${input.totalScenarios} scenarios covering ${input.totalTestCases} test cases (${input.distributionSummary}). ` +
    `Requirement coverage is ${coverage} and automation readiness is ${automation}. ` +
    `Please review the attached test case document and reply with your approval or feedback.`
  );
}

@QueryHandler(GetSubmissionDraftQuery)
export class GetSubmissionDraftHandler implements IQueryHandler<GetSubmissionDraftQuery, { summary: string }> {
  private readonly logger = new Logger(GetSubmissionDraftHandler.name);

  constructor(
    @Inject(STORY_BA_REVIEW_STATE_REPOSITORY) private readonly stateRepository: IStoryBaReviewStateRepository,
    @Inject(BA_REVIEW_CYCLE_REPOSITORY) private readonly cycleRepository: IBaReviewCycleRepository,
    @Inject(STORY_CONTEXT_READ_REPOSITORY) private readonly storyContextRepository: IStoryContextReadRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
  ) {}

  async execute(query: GetSubmissionDraftQuery): Promise<{ summary: string }> {
    const story = await this.storyContextRepository.findById(query.storyId, query.organizationId);
    if (!story) {
      throw new NotFoundException('Story not found');
    }

    const state = await this.stateRepository.findByStoryId(query.storyId, query.organizationId);
    if (!state || !state.activeReviewCycleId) {
      throw new BadRequestException('No test cases have been generated for this story yet.');
    }
    const activeCycle = await this.cycleRepository.findById(state.activeReviewCycleId);
    if (!activeCycle) {
      throw new NotFoundException('Active review cycle not found');
    }

    const totalScenarios = activeCycle.testCasesSnapshot.length;
    const distributionSummary = formatDistribution(activeCycle.distribution);
    const draftInput = {
      storyTitle: story.title,
      documentVersionLabel: activeCycle.documentVersionLabel,
      totalScenarios,
      totalTestCases: activeCycle.totalTestCases,
      distributionSummary,
      coveragePercent: activeCycle.coveragePercent,
      automationReadinessPercent: activeCycle.automationReadinessPercent,
    };

    try {
      const result = await this.aiOrchestrationService.execute({
        capability: 'ba-review-submission-summary',
        agentKey: 'ba-review-submission-summary-agent',
        organizationId: query.organizationId,
        provider: CAPABILITY_PROVIDER_PINS['ba-review-submission-summary'],
        variables: {
          storyTitle: draftInput.storyTitle,
          documentVersionLabel: draftInput.documentVersionLabel,
          totalScenarios: draftInput.totalScenarios,
          totalTestCases: draftInput.totalTestCases,
          distributionSummary: draftInput.distributionSummary,
          coveragePercent: draftInput.coveragePercent !== null ? `${draftInput.coveragePercent.toFixed(1)}%` : 'N/A',
          automationReadinessPercent:
            draftInput.automationReadinessPercent !== null ? `${draftInput.automationReadinessPercent.toFixed(1)}%` : 'N/A',
        },
        outputSchema: submissionSummaryOutputSchema,
      });
      return { summary: result.data.summary };
    } catch (error) {
      this.logger.warn(`Submission summary AI draft failed for story ${query.storyId}, using fallback: ${error}`);
      return { summary: fallbackSummary(draftInput) };
    }
  }
}
