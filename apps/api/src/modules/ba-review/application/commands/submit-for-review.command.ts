import { BadRequestException, ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
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
import { DocumentBuilderService } from '../services/document-builder.service';
import { PostReviewCommentService } from '../services/post-review-comment.service';
import { ResolvedBaAccount } from '../services/resolve-ba-account.service';

export interface SubmitForReviewAttachment {
  buffer: Buffer;
  filename: string;
}

// Additional, explicit path alongside the automatic postInitial/postFollowup triggers fired by test
// generation -- acts on the *existing* active cycle rather than minting a new BaReviewCycle
// version. This is a resubmission/custom-recipients action on already-generated content (editable
// summary, mandatory mention, optional CC/comment/replacement attachment), not a new generation --
// bumping the version for byte-identical test cases would corrupt what "version" means in the
// existing review timeline.
export class SubmitForReviewCommand {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
    public readonly actorId: string,
    public readonly mention: ResolvedBaAccount,
    public readonly ccMentions: ResolvedBaAccount[],
    public readonly summary: string,
    public readonly comment: string | null,
    public readonly replacementAttachment: SubmitForReviewAttachment | null,
  ) {}
}

@CommandHandler(SubmitForReviewCommand)
export class SubmitForReviewHandler
  implements ICommandHandler<SubmitForReviewCommand, { commentId: string; attachmentId: string | null }>
{
  constructor(
    @Inject(STORY_BA_REVIEW_STATE_REPOSITORY) private readonly stateRepository: IStoryBaReviewStateRepository,
    @Inject(BA_REVIEW_CYCLE_REPOSITORY) private readonly cycleRepository: IBaReviewCycleRepository,
    @Inject(STORY_CONTEXT_READ_REPOSITORY) private readonly storyContextRepository: IStoryContextReadRepository,
    private readonly documentBuilderService: DocumentBuilderService,
    private readonly postReviewCommentService: PostReviewCommentService,
  ) {}

  async execute(command: SubmitForReviewCommand): Promise<{ commentId: string; attachmentId: string | null }> {
    const story = await this.storyContextRepository.findById(command.storyId, command.organizationId);
    if (!story) {
      throw new NotFoundException('Story not found');
    }
    if (!story.externalId || !story.sourceConnectionId) {
      throw new BadRequestException('This story has no live Jira connection to submit a review to.');
    }

    const state = await this.stateRepository.findByStoryId(command.storyId, command.organizationId);
    if (!state || !state.activeReviewCycleId) {
      throw new BadRequestException('No test cases have been generated for this story yet. Generate test cases first.');
    }
    if (state.isLocked) {
      throw new ForbiddenException(
        'This story is BA-approved and locked. An Admin must unlock it before submitting another review.',
      );
    }

    const activeCycle = await this.cycleRepository.findById(state.activeReviewCycleId);
    if (!activeCycle) {
      throw new NotFoundException('Active review cycle not found');
    }

    const documentBuffer =
      command.replacementAttachment?.buffer ??
      this.documentBuilderService.buildTestCaseWorkbook({
        storyExternalId: story.externalId,
        storyTitle: story.title,
        sprintName: story.sprintName,
        documentVersionLabel: activeCycle.documentVersionLabel,
        testCasesSnapshot: activeCycle.testCasesSnapshot,
        distribution: activeCycle.distribution,
        totalTestCases: activeCycle.totalTestCases,
        coveragePercent: activeCycle.coveragePercent,
        automationReadinessPercent: activeCycle.automationReadinessPercent,
        aiModelVersion: activeCycle.aiModelVersion,
        promptVersion: activeCycle.promptVersion,
        generatedAt: activeCycle.generatedAt,
      });
    const documentFilename =
      command.replacementAttachment?.filename ?? `${story.externalId}-test-cases-${activeCycle.documentVersionLabel}.xlsx`;

    const result = await this.postReviewCommentService.postManualSubmission({
      organizationId: command.organizationId,
      connectionId: story.sourceConnectionId,
      externalId: story.externalId,
      storyId: command.storyId,
      reviewCycleId: activeCycle.id,
      mention: command.mention,
      ccMentions: command.ccMentions,
      summary: command.summary,
      comment: command.comment,
      documentBuffer,
      documentFilename,
    });

    await this.cycleRepository.setJiraPostResult(activeCycle.id, result.commentId, result.attachmentId);
    await this.stateRepository.setStatus(command.storyId, 'AWAITING_APPROVAL');

    return result;
  }
}
