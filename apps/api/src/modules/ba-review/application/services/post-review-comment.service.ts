import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { PostIssueCommentCommand } from '../../../integration/application/commands/post-issue-comment.command';
import { UploadIssueAttachmentCommand } from '../../../integration/application/commands/upload-issue-attachment.command';
import {
  BA_REVIEW_SYNC_LOG_REPOSITORY,
  IBaReviewSyncLogRepository,
} from '../../domain/repositories/ba-review-sync-log.repository.interface';
import { TestCaseDistribution, ImprovementSummary } from '../../domain/entities/ba-review-cycle.entity';
import { ResolvedBaAccount } from './resolve-ba-account.service';

interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: { type: string }[];
}

type InlineRun = string | { mention: ResolvedBaAccount } | { strong: string };

const MAX_ATTEMPTS = 3;

function textRun(text: string, strong = false): AdfNode {
  return strong ? { type: 'text', text, marks: [{ type: 'strong' }] } : { type: 'text', text };
}

function mentionRun(account: ResolvedBaAccount): AdfNode {
  return { type: 'mention', attrs: { id: account.accountId, text: `@${account.displayName}` } };
}

function paragraph(runs: InlineRun[]): AdfNode {
  return {
    type: 'paragraph',
    content: runs.map((run) => {
      if (typeof run === 'string') return textRun(run);
      if ('mention' in run) return mentionRun(run.mention);
      return textRun(run.strong, true);
    }),
  };
}

function bulletList(items: string[]): AdfNode {
  return {
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [{ type: 'paragraph', content: [textRun(item)] }],
    })),
  };
}

function doc(content: AdfNode[]): unknown {
  return { type: 'doc', version: 1, content };
}

function formatDistribution(distribution: TestCaseDistribution): string {
  return Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');
}

// Builds + posts the BA review Jira comment (initial or follow-up) with its Excel attachment, via
// the integration module's CommandBus-exposed connector wrappers -- ba-review never imports
// JiraConnectorService directly (same cross-module boundary as everywhere else in this codebase).
// Every attempt is logged to BaReviewSyncLog so sync failures are visible/retryable, satisfying the
// spec's "retry automatically and maintain synchronization logs" requirement.
@Injectable()
export class PostReviewCommentService {
  private readonly logger = new Logger(PostReviewCommentService.name);

  constructor(
    private readonly commandBus: CommandBus,
    @Inject(BA_REVIEW_SYNC_LOG_REPOSITORY)
    private readonly syncLogRepository: IBaReviewSyncLogRepository,
  ) {}

  async postInitial(input: {
    organizationId: string;
    connectionId: string;
    externalId: string;
    storyId: string;
    reviewCycleId: string;
    mention: ResolvedBaAccount | null;
    storyExternalId: string;
    storyTitle: string;
    sprintName: string;
    documentVersionLabel: string;
    totalTestCases: number;
    distribution: TestCaseDistribution;
    coveragePercent: number | null;
    automationReadinessPercent: number | null;
    generatedAt: Date;
    aiModelVersion: string;
    promptVersion: string;
    documentBuffer: Buffer;
    documentFilename: string;
  }): Promise<{ commentId: string; attachmentId: string | null }> {
    const body = doc([
      paragraph([{ strong: 'SprintGuard AI — Test Case Review Request' }]),
      paragraph([
        `SprintGuard AI has generated test cases (${input.documentVersionLabel}) for `,
        { strong: `${input.storyExternalId} — ${input.storyTitle}` },
        '. Please find the summary below and the full test case document attached.',
      ]),
      bulletList([
        `User Story ID: ${input.storyExternalId}`,
        `User Story Title: ${input.storyTitle}`,
        `Sprint Name: ${input.sprintName}`,
        `Total Test Cases Generated: ${input.totalTestCases}`,
        `Test Case Distribution: ${formatDistribution(input.distribution)}`,
        `Requirement Coverage: ${input.coveragePercent !== null ? `${input.coveragePercent.toFixed(1)}%` : 'N/A'}`,
        `Automation Readiness: ${input.automationReadinessPercent !== null ? `${input.automationReadinessPercent.toFixed(1)}%` : 'N/A'}`,
        `AI Generation Timestamp: ${input.generatedAt.toISOString()}`,
        `AI Model Version: ${input.aiModelVersion}`,
        `Prompt Version: ${input.promptVersion}`,
      ]),
      paragraph(
        input.mention
          ? [
              { mention: input.mention },
              ', could you please review the attached test cases and reply on this thread with your approval (e.g. "Approved") or any feedback? Thank you.',
            ]
          : [
              'Could the assigned Business Analyst please review the attached test cases and reply on this thread with approval or feedback? (No BA Jira account could be resolved to @mention automatically -- check the story\'s assigned BA email.)',
            ],
      ),
    ]);

    return this.postAndAttach({
      organizationId: input.organizationId,
      connectionId: input.connectionId,
      externalId: input.externalId,
      storyId: input.storyId,
      reviewCycleId: input.reviewCycleId,
      commentAdfBody: body,
      commentAction: 'POST_INITIAL_COMMENT',
      documentBuffer: input.documentBuffer,
      documentFilename: input.documentFilename,
    });
  }

  async postFollowup(input: {
    organizationId: string;
    connectionId: string;
    externalId: string;
    storyId: string;
    reviewCycleId: string;
    mention: ResolvedBaAccount | null;
    documentVersionLabel: string;
    previousVersionLabel: string;
    improvementSummary: ImprovementSummary;
    documentBuffer: Buffer;
    documentFilename: string;
  }): Promise<{ commentId: string; attachmentId: string | null }> {
    const { improvementSummary: summary } = input;
    const body = doc([
      paragraph([{ strong: `SprintGuard AI — Improved Test Cases (${input.documentVersionLabel})` }]),
      paragraph([
        `The requested improvements have been completed for `,
        { strong: input.documentVersionLabel },
        ` (previous version: ${input.previousVersionLabel}). Summary below, updated document attached.`,
      ]),
      bulletList([
        `Feedback received: ${summary.feedbackSummary}`,
        `Test cases added: ${summary.added.length}`,
        `Test cases modified: ${summary.modified.length}`,
        `Test cases removed: ${Object.keys(summary.removedReasons).length}`,
        `Coverage impact: ${summary.coverageImpact}`,
        `Automation readiness impact: ${summary.automationReadinessImpact}`,
        `Traceability impact: ${summary.traceabilityImpact}`,
      ]),
      paragraph(
        input.mention
          ? [{ mention: input.mention }, ', these improvements are ready for another review. Please reply on this thread. Thank you.']
          : ['Please review the updated test cases and reply on this thread with approval or further feedback.'],
      ),
    ]);

    return this.postAndAttach({
      organizationId: input.organizationId,
      connectionId: input.connectionId,
      externalId: input.externalId,
      storyId: input.storyId,
      reviewCycleId: input.reviewCycleId,
      commentAdfBody: body,
      commentAction: 'POST_FOLLOWUP_COMMENT',
      documentBuffer: input.documentBuffer,
      documentFilename: input.documentFilename,
    });
  }

  // Submit for Review modal's explicit path (additional to the automatic postInitial/postFollowup
  // triggers) -- posts a user-edited summary, an optional free-text comment, a mandatory BA
  // mention, and optional CC mentions, using whichever attachment the caller resolved (either the
  // freshly-rebuilt workbook from the active cycle's snapshot, or a user-uploaded replacement).
  async postManualSubmission(input: {
    organizationId: string;
    connectionId: string;
    externalId: string;
    storyId: string;
    reviewCycleId: string;
    mention: ResolvedBaAccount;
    ccMentions: ResolvedBaAccount[];
    summary: string;
    comment: string | null;
    documentBuffer: Buffer;
    documentFilename: string;
  }): Promise<{ commentId: string; attachmentId: string | null }> {
    const summaryParagraphs = input.summary
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => paragraph([line]));

    const mentionRuns: InlineRun[] = [
      { mention: input.mention },
      ...input.ccMentions.flatMap((cc): InlineRun[] => [' ', { mention: cc }]),
    ];

    const body = doc([
      paragraph([{ strong: 'SprintGuard AI — Test Cases Submitted for Review' }]),
      ...summaryParagraphs,
      ...(input.comment ? [paragraph([input.comment])] : []),
      paragraph([
        ...mentionRuns,
        ', please review the attached test cases and reply on this thread with your approval or any feedback. Thank you.',
      ]),
    ]);

    return this.postAndAttach({
      organizationId: input.organizationId,
      connectionId: input.connectionId,
      externalId: input.externalId,
      storyId: input.storyId,
      reviewCycleId: input.reviewCycleId,
      commentAdfBody: body,
      commentAction: 'POST_MANUAL_SUBMISSION',
      documentBuffer: input.documentBuffer,
      documentFilename: input.documentFilename,
    });
  }

  private async postAndAttach(input: {
    organizationId: string;
    connectionId: string;
    externalId: string;
    storyId: string;
    reviewCycleId: string;
    commentAdfBody: unknown;
    commentAction: 'POST_INITIAL_COMMENT' | 'POST_FOLLOWUP_COMMENT' | 'POST_MANUAL_SUBMISSION';
    documentBuffer: Buffer;
    documentFilename: string;
  }): Promise<{ commentId: string; attachmentId: string | null }> {
    const attachmentResult = await this.withRetry(
      input,
      'UPLOAD_ATTACHMENT',
      () =>
        this.commandBus.execute<UploadIssueAttachmentCommand, { attachmentId: string }>(
          new UploadIssueAttachmentCommand(input.organizationId, input.connectionId, input.externalId, {
            filename: input.documentFilename,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            buffer: input.documentBuffer,
          }),
        ),
      true,
    );

    const commentResult = await this.withRetry(input, input.commentAction, () =>
      this.commandBus.execute<PostIssueCommentCommand, { commentId: string }>(
        new PostIssueCommentCommand(input.organizationId, input.connectionId, input.externalId, input.commentAdfBody),
      ),
    );

    if (!commentResult) {
      throw new Error('Failed to post BA review comment');
    }
    return { commentId: commentResult.commentId, attachmentId: attachmentResult?.attachmentId ?? null };
  }

  private async withRetry<T>(
    ctx: { storyId: string; organizationId: string; reviewCycleId: string },
    action: 'UPLOAD_ATTACHMENT' | 'POST_INITIAL_COMMENT' | 'POST_FOLLOWUP_COMMENT' | 'POST_MANUAL_SUBMISSION',
    fn: () => Promise<T>,
    optional = false,
  ): Promise<T | null> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await fn();
        await this.syncLogRepository.record({
          storyId: ctx.storyId,
          organizationId: ctx.organizationId,
          reviewCycleId: ctx.reviewCycleId,
          action,
          status: 'SUCCESS',
          attempt,
          errorMessage: null,
        });
        return result;
      } catch (error) {
        lastError = error;
        this.logger.warn(`BA review sync action ${action} failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${error}`);
        await this.syncLogRepository.record({
          storyId: ctx.storyId,
          organizationId: ctx.organizationId,
          reviewCycleId: ctx.reviewCycleId,
          action,
          status: 'FAILED',
          attempt,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }
    if (optional) {
      return null;
    }
    throw lastError;
  }
}
