import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { AiOrchestrationService, CAPABILITY_PROVIDER_PINS } from '../../../ai/application/services/ai-orchestration.service';
import { AuditLogService } from '../../../integration/infrastructure/services/audit-log.service';
import { MarkAutomationOutdatedCommand } from '../../../automation/application/commands/mark-automation-outdated.command';
import {
  TEST_CASE_REPOSITORY,
  ITestCaseRepository,
} from '../../../test-intelligence/domain/repositories/test-case.repository.interface';
import {
  TEST_SCENARIO_REPOSITORY,
  ITestScenarioRepository,
} from '../../../test-intelligence/domain/repositories/test-scenario.repository.interface';
import {
  GetRequirementAnalysisReportQuery,
} from '../../../requirement-intelligence/application/queries/get-requirement-analysis-report.query';
import { RequirementAnalysisReportEntity } from '../../../requirement-intelligence/domain/entities/requirement-analysis-report.entity';
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
import { testCaseImprovementOutputSchema } from '../schemas/test-case-improvement.schema';
import { computeAutomationReadinessPercent, computeDistribution, countTotalTestCases } from '../utils/test-case-distribution.util';

export class RegenerateFromFeedbackCommand {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
    public readonly reviewCycleId: string,
  ) {}
}

// Triggered by ProcessBaReplyCommand once a BA reply is classified as feedback (not an approval
// keyword). Merges the BA's feedback with the existing story/AC/RequirementAnalysisReport/coverage/
// previous test-case baseline into one AI call, then applies only the returned changeset --
// preserving every test case the AI didn't flag as needing a change (spec requirement).
@CommandHandler(RegenerateFromFeedbackCommand)
export class RegenerateFromFeedbackHandler implements ICommandHandler<RegenerateFromFeedbackCommand, BaReviewCycleEntity> {
  private readonly logger = new Logger(RegenerateFromFeedbackHandler.name);

  constructor(
    @Inject(STORY_CONTEXT_READ_REPOSITORY) private readonly storyContextRepository: IStoryContextReadRepository,
    @Inject(STORY_BA_REVIEW_STATE_REPOSITORY) private readonly stateRepository: IStoryBaReviewStateRepository,
    @Inject(BA_REVIEW_CYCLE_REPOSITORY) private readonly cycleRepository: IBaReviewCycleRepository,
    @Inject(TEST_CASE_REPOSITORY) private readonly testCaseRepository: ITestCaseRepository,
    @Inject(TEST_SCENARIO_REPOSITORY) private readonly testScenarioRepository: ITestScenarioRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
    private readonly coverageLookupService: StoryCoverageLookupService,
    private readonly documentBuilderService: DocumentBuilderService,
    private readonly resolveBaAccountService: ResolveBaAccountService,
    private readonly postReviewCommentService: PostReviewCommentService,
    private readonly auditLogService: AuditLogService,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: RegenerateFromFeedbackCommand): Promise<BaReviewCycleEntity> {
    const previousCycle = await this.cycleRepository.findById(command.reviewCycleId);
    if (!previousCycle) {
      throw new NotFoundException('Review cycle not found');
    }
    const story = await this.storyContextRepository.findById(command.storyId, command.organizationId);
    if (!story) {
      throw new NotFoundException('Story not found');
    }

    await this.stateRepository.setStatus(command.storyId, 'REGENERATION_IN_PROGRESS');

    try {
      const analysisReport = await this.queryBus
        .execute<GetRequirementAnalysisReportQuery, RequirementAnalysisReportEntity | null>(
          new GetRequirementAnalysisReportQuery(command.storyId, command.organizationId),
        )
        .catch(() => null);

      const result = await this.aiOrchestrationService.execute({
        capability: 'test-case-improvement',
        agentKey: 'test-case-improvement-agent',
        organizationId: command.organizationId,
        variables: {
          storyTitle: story.title,
          storyDescription: story.description ?? 'No description provided.',
          previousRequirementAnalysisJson: analysisReport ? JSON.stringify(analysisReport.analysis) : 'Not available.',
          previousTestCasesJson: JSON.stringify(previousCycle.testCasesSnapshot),
          baFeedback: previousCycle.feedbackText ?? '',
          previousVersionLabel: previousCycle.documentVersionLabel,
        },
        outputSchema: testCaseImprovementOutputSchema,
        provider: CAPABILITY_PROVIDER_PINS['test-case-improvement'],
        // Stable per-story key: rejects a second concurrent feedback-driven regeneration for the
        // same story (e.g. a duplicated BA-reply webhook/poll) instead of racing this call's
        // applyChangeset() write and the state machine's REGENERATION_IN_PROGRESS transition above.
        correlationId: `test-case-improvement:${command.storyId}`,
      });

      const { added, modified, removed, improvementSummary } = result.data;

      await this.testCaseRepository.applyChangeset({
        storyId: command.storyId,
        added: added.map((tc) => ({
          testScenarioId: tc.scenarioId,
          title: tc.title,
          steps: tc.steps,
          priority: tc.priority,
          description: tc.description,
          severity: tc.severity,
          module: tc.module,
          testType: tc.testType,
          tags: tc.tags,
          automationStatus: tc.automationStatus,
          automationType: tc.automationType,
          apiEndpoint: tc.apiEndpoint,
          uiScreen: tc.uiScreen,
          testObjective: tc.testObjective,
          preconditions: tc.preconditions,
          dependencies: tc.dependencies,
          requestMethod: tc.requestMethod,
          requestPayload: tc.requestPayload,
          expectedStatusCode: tc.expectedStatusCode,
          expectedResponse: tc.expectedResponse,
          remarks: tc.remarks,
        })),
        modified: modified.map((tc) => ({
          id: tc.id,
          title: tc.title,
          steps: tc.steps,
          priority: tc.priority,
          description: tc.description,
          severity: tc.severity,
          module: tc.module,
          testType: tc.testType,
          tags: tc.tags,
          automationStatus: tc.automationStatus,
          automationType: tc.automationType,
          apiEndpoint: tc.apiEndpoint,
          uiScreen: tc.uiScreen,
          testObjective: tc.testObjective,
          preconditions: tc.preconditions,
          dependencies: tc.dependencies,
          requestMethod: tc.requestMethod,
          requestPayload: tc.requestPayload,
          expectedStatusCode: tc.expectedStatusCode,
          expectedResponse: tc.expectedResponse,
          remarks: tc.remarks,
        })),
        removedIds: removed.map((r) => r.id),
      });

      // Any automation already generated for a case the AI just rewrote no longer reflects that
      // case's current content -- flag it rather than silently leaving stale generated code looking
      // current. Added cases have no prior automation yet; removed cases' automation rows cascade-
      // delete with the TestCase row itself, so only `modified` needs this.
      if (modified.length > 0) {
        await this.commandBus.execute(new MarkAutomationOutdatedCommand(modified.map((tc) => tc.id)));
      }

      const scenarios = await this.testScenarioRepository.findByStoryId(command.storyId);
      const testCasesSnapshot: TestCaseSnapshotEntry[] = scenarios.map((scenario) => ({
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        testCases: scenario.testCases.map((testCase) => ({
          id: testCase.id,
          title: testCase.title,
          description: testCase.description,
          steps: testCase.steps,
          priority: testCase.priority,
          severity: testCase.severity,
          testType: testCase.testType,
          automationStatus: testCase.automationStatus,
          displayId: testCase.displayId,
          testObjective: testCase.testObjective,
          preconditions: testCase.preconditions,
          dependencies: testCase.dependencies,
          requestMethod: testCase.requestMethod,
          requestPayload: testCase.requestPayload,
          expectedStatusCode: testCase.expectedStatusCode,
          expectedResponse: testCase.expectedResponse,
          remarks: testCase.remarks,
        })),
      }));

      const distribution = computeDistribution(testCasesSnapshot);
      const totalTestCases = countTotalTestCases(testCasesSnapshot);
      const automationReadinessPercent = computeAutomationReadinessPercent(testCasesSnapshot);
      const coveragePercent = await this.coverageLookupService.getStoryCoveragePercent(command.storyId);
      const generatedAt = new Date();

      const state = await this.stateRepository.ensureForStory(command.storyId, command.organizationId);
      const version = state.currentVersion + 1;

      const newCycle = await this.cycleRepository.create({
        storyBaReviewStateId: state.id,
        storyId: command.storyId,
        organizationId: command.organizationId,
        version,
        generatedBy: null,
        aiProvider: result.provider,
        aiModelVersion: result.model,
        promptVersion: result.promptVersion,
        requirementAnalysisReportId: analysisReport?.id ?? null,
        testCasesSnapshot,
        distribution,
        totalTestCases,
        coveragePercent,
        automationReadinessPercent,
        jiraIssueKey: story.externalId ?? command.storyId,
        respondsToFeedbackFromVersionId: previousCycle.id,
        improvementSummary: {
          feedbackSummary: improvementSummary.feedbackSummary,
          added: added.map((tc) => ({ title: tc.title, testType: tc.testType })),
          modified: modified.map((tc) => ({ title: tc.title, changeReason: tc.changeReason })),
          removedReasons: Object.fromEntries(removed.map((r) => [r.id, r.reason])),
          coverageImpact: improvementSummary.coverageImpact,
          automationReadinessImpact: improvementSummary.automationReadinessImpact,
          traceabilityImpact: improvementSummary.traceabilityImpact,
        },
      });

      await this.stateRepository.startNewCycle(command.storyId, newCycle.id, version);

      await this.auditLogService.record(
        command.organizationId,
        null,
        'ba_review.regenerated_from_feedback',
        'Story',
        command.storyId,
        { previousReviewCycleId: previousCycle.id, feedbackText: previousCycle.feedbackText, feedbackAuthor: previousCycle.feedbackAuthor },
        {
          reviewCycleId: newCycle.id,
          version: newCycle.documentVersionLabel,
          totalTestCases,
          feedbackSummary: improvementSummary.feedbackSummary,
          aiProvider: result.provider,
          aiModelVersion: result.model,
          promptVersion: result.promptVersion,
        },
      );

      if (story.externalId && story.sourceConnectionId) {
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
          documentVersionLabel: newCycle.documentVersionLabel,
          testCasesSnapshot,
          distribution,
          totalTestCases,
          coveragePercent,
          automationReadinessPercent,
          aiModelVersion: result.model,
          promptVersion: result.promptVersion,
          generatedAt,
        });

        try {
          const { commentId, attachmentId } = await this.postReviewCommentService.postFollowup({
            organizationId: command.organizationId,
            connectionId: story.sourceConnectionId,
            externalId: story.externalId,
            storyId: command.storyId,
            reviewCycleId: newCycle.id,
            mention,
            documentVersionLabel: newCycle.documentVersionLabel,
            previousVersionLabel: previousCycle.documentVersionLabel,
            improvementSummary: newCycle.improvementSummary!,
            documentBuffer,
            documentFilename: `${story.externalId}-test-cases-${newCycle.documentVersionLabel}.xlsx`,
          });
          await this.cycleRepository.setJiraPostResult(newCycle.id, commentId, attachmentId);
        } catch (error) {
          this.logger.error(`Failed to post BA review follow-up comment for story ${command.storyId}: ${error}`);
        }
      }

      await this.stateRepository.setStatus(command.storyId, 'AWAITING_APPROVAL');
      return (await this.cycleRepository.findById(newCycle.id)) ?? newCycle;
    } catch (error) {
      this.logger.error(`Feedback-driven regeneration failed for story ${command.storyId}: ${error}`);
      await this.stateRepository.setStatus(command.storyId, 'FEEDBACK_RECEIVED');
      throw error;
    }
  }
}
