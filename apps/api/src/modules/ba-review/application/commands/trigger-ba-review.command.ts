import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuditLogService } from '../../../integration/infrastructure/services/audit-log.service';
import {
  STORY_CONTEXT_READ_REPOSITORY,
  IStoryContextReadRepository,
} from '../../domain/repositories/story-context-read.repository.interface';
import {
  STORY_BA_REVIEW_STATE_REPOSITORY,
  IStoryBaReviewStateRepository,
} from '../../domain/repositories/story-ba-review-state.repository.interface';
import {
  BA_REVIEW_CYCLE_REPOSITORY,
  IBaReviewCycleRepository,
} from '../../domain/repositories/ba-review-cycle.repository.interface';
import { BaReviewCycleEntity, TestCaseSnapshotEntry } from '../../domain/entities/ba-review-cycle.entity';
import { StoryCoverageLookupService } from '../../infrastructure/services/story-coverage-lookup.service';
import { DocumentBuilderService } from '../services/document-builder.service';
import { ResolveBaAccountService } from '../services/resolve-ba-account.service';
import { PostReviewCommentService } from '../services/post-review-comment.service';
import { computeAutomationReadinessPercent, computeDistribution, countTotalTestCases } from '../utils/test-case-distribution.util';

export class TriggerBaReviewCommand {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
    public readonly actorId: string | null,
    public readonly testCasesSnapshot: TestCaseSnapshotEntry[],
    public readonly aiProvider: string,
    public readonly aiModelVersion: string,
    public readonly promptVersion: string,
  ) {}
}

// Fired fire-and-forget (commandBus.execute(...).catch(...)) by RunTestGenerationHandler right
// after test cases are persisted -- same pattern as RunDeepRequirementAnalysisHandler ->
// RunRequirementIntelligenceAgentCommand. Posting to Jira is a slower, network-flaky side effect
// that must never make the "Generate tests" HTTP call fail or hang.
@CommandHandler(TriggerBaReviewCommand)
export class TriggerBaReviewHandler implements ICommandHandler<TriggerBaReviewCommand, BaReviewCycleEntity | null> {
  private readonly logger = new Logger(TriggerBaReviewHandler.name);

  constructor(
    @Inject(STORY_CONTEXT_READ_REPOSITORY) private readonly storyContextRepository: IStoryContextReadRepository,
    @Inject(STORY_BA_REVIEW_STATE_REPOSITORY) private readonly stateRepository: IStoryBaReviewStateRepository,
    @Inject(BA_REVIEW_CYCLE_REPOSITORY) private readonly cycleRepository: IBaReviewCycleRepository,
    private readonly coverageLookupService: StoryCoverageLookupService,
    private readonly documentBuilderService: DocumentBuilderService,
    private readonly resolveBaAccountService: ResolveBaAccountService,
    private readonly postReviewCommentService: PostReviewCommentService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: TriggerBaReviewCommand): Promise<BaReviewCycleEntity | null> {
    const story = await this.storyContextRepository.findById(command.storyId, command.organizationId);
    if (!story) {
      throw new NotFoundException('Story not found');
    }
    if (command.testCasesSnapshot.length === 0) {
      this.logger.log(`No test cases generated for story ${command.storyId}; skipping BA review submission.`);
      return null;
    }

    const state = await this.stateRepository.ensureForStory(command.storyId, command.organizationId);
    const version = state.currentVersion + 1;
    const [coveragePercent] = await Promise.all([this.coverageLookupService.getStoryCoveragePercent(command.storyId)]);
    const automationReadinessPercent = computeAutomationReadinessPercent(command.testCasesSnapshot);
    const distribution = computeDistribution(command.testCasesSnapshot);
    const totalTestCases = countTotalTestCases(command.testCasesSnapshot);
    const generatedAt = new Date();

    const cycle = await this.cycleRepository.create({
      storyBaReviewStateId: state.id,
      storyId: command.storyId,
      organizationId: command.organizationId,
      version,
      generatedBy: command.actorId,
      aiProvider: command.aiProvider,
      aiModelVersion: command.aiModelVersion,
      promptVersion: command.promptVersion,
      requirementAnalysisReportId: null,
      testCasesSnapshot: command.testCasesSnapshot,
      distribution,
      totalTestCases,
      coveragePercent,
      automationReadinessPercent,
      jiraIssueKey: story.externalId ?? command.storyId,
      respondsToFeedbackFromVersionId: null,
      improvementSummary: null,
    });

    await this.stateRepository.startNewCycle(command.storyId, cycle.id, version);

    await this.auditLogService.record(
      command.organizationId,
      command.actorId,
      'ba_review.cycle_generated',
      'Story',
      command.storyId,
      undefined,
      {
        reviewCycleId: cycle.id,
        version: cycle.documentVersionLabel,
        totalTestCases,
        coveragePercent,
        automationReadinessPercent,
        aiProvider: command.aiProvider,
        aiModelVersion: command.aiModelVersion,
        promptVersion: command.promptVersion,
      },
    );

    if (!story.externalId || !story.sourceConnectionId) {
      this.logger.log(`Story ${command.storyId} has no live Jira connection; skipping BA review Jira post.`);
      return cycle;
    }

    const mention = await this.resolveBaAccountService.resolve({
      organizationId: command.organizationId,
      connectionId: story.sourceConnectionId,
      storyId: command.storyId,
      assignedBaEmail: story.assignedBaEmail,
      cachedAccountId: story.assignedBaJiraAccountId,
    });

    const documentBuffer = this.documentBuilderService.buildTestCaseWorkbook({
      storyExternalId: story.externalId,
      storyTitle: story.title,
      sprintName: story.sprintName,
      documentVersionLabel: cycle.documentVersionLabel,
      testCasesSnapshot: command.testCasesSnapshot,
      distribution,
      totalTestCases,
      coveragePercent,
      automationReadinessPercent,
      aiModelVersion: command.aiModelVersion,
      promptVersion: command.promptVersion,
      generatedAt,
    });

    try {
      const { commentId, attachmentId } = await this.postReviewCommentService.postInitial({
        organizationId: command.organizationId,
        connectionId: story.sourceConnectionId,
        externalId: story.externalId,
        storyId: command.storyId,
        reviewCycleId: cycle.id,
        mention,
        storyExternalId: story.externalId,
        storyTitle: story.title,
        sprintName: story.sprintName,
        documentVersionLabel: cycle.documentVersionLabel,
        totalTestCases,
        distribution,
        coveragePercent,
        automationReadinessPercent,
        generatedAt,
        aiModelVersion: command.aiModelVersion,
        promptVersion: command.promptVersion,
        documentBuffer,
        documentFilename: `${story.externalId}-test-cases-${cycle.documentVersionLabel}.xlsx`,
      });

      await this.cycleRepository.setJiraPostResult(cycle.id, commentId, attachmentId);
      await this.stateRepository.setStatus(command.storyId, 'AWAITING_APPROVAL');
    } catch (error) {
      this.logger.error(`Failed to post BA review comment for story ${command.storyId}: ${error}`);
    }

    return this.cycleRepository.findById(cycle.id);
  }
}
