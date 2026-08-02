import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  CreateBaReviewCycleInput,
  IBaReviewCycleRepository,
} from '../../domain/repositories/ba-review-cycle.repository.interface';
import { toBaReviewCycleEntity } from '../mappers';

@Injectable()
export class PrismaBaReviewCycleRepository implements IBaReviewCycleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateBaReviewCycleInput) {
    const row = await this.prisma.baReviewCycle.create({
      data: {
        storyBaReviewStateId: input.storyBaReviewStateId,
        storyId: input.storyId,
        organizationId: input.organizationId,
        version: input.version,
        documentVersionLabel: `V${input.version}`,
        generatedBy: input.generatedBy,
        aiProvider: input.aiProvider,
        aiModelVersion: input.aiModelVersion,
        promptVersion: input.promptVersion,
        requirementAnalysisReportId: input.requirementAnalysisReportId,
        testCasesSnapshotJson: input.testCasesSnapshot as unknown as Prisma.InputJsonValue,
        distributionJson: input.distribution as unknown as Prisma.InputJsonValue,
        totalTestCases: input.totalTestCases,
        coveragePercent: input.coveragePercent,
        automationReadinessPercent: input.automationReadinessPercent,
        jiraIssueKey: input.jiraIssueKey,
        respondsToFeedbackFromVersionId: input.respondsToFeedbackFromVersionId,
        improvementSummaryJson: input.improvementSummary as unknown as Prisma.InputJsonValue | undefined,
      },
    });
    return toBaReviewCycleEntity(row);
  }

  async findById(id: string) {
    const row = await this.prisma.baReviewCycle.findUnique({ where: { id } });
    return row ? toBaReviewCycleEntity(row) : null;
  }

  async findActiveForStory(storyId: string) {
    const state = await this.prisma.storyBaReviewState.findUnique({
      where: { storyId },
      select: { activeReviewCycleId: true },
    });
    if (!state?.activeReviewCycleId) return null;
    const row = await this.prisma.baReviewCycle.findUnique({ where: { id: state.activeReviewCycleId } });
    return row ? toBaReviewCycleEntity(row) : null;
  }

  async findHistoryByStoryId(storyId: string, organizationId: string) {
    const rows = await this.prisma.baReviewCycle.findMany({
      where: { storyId, organizationId },
      orderBy: { version: 'desc' },
    });
    return rows.map(toBaReviewCycleEntity);
  }

  async setJiraPostResult(id: string, jiraCommentId: string, jiraAttachmentId: string | null): Promise<void> {
    await this.prisma.baReviewCycle.update({ where: { id }, data: { jiraCommentId, jiraAttachmentId } });
  }

  async recordFeedback(input: {
    id: string;
    feedbackText: string;
    feedbackAuthor: string;
    feedbackJiraCommentId: string;
    feedbackReceivedAt: Date;
  }): Promise<void> {
    await this.prisma.baReviewCycle.update({
      where: { id: input.id },
      data: {
        approvalStatus: 'FEEDBACK_RECEIVED',
        feedbackText: input.feedbackText,
        feedbackAuthor: input.feedbackAuthor,
        feedbackJiraCommentId: input.feedbackJiraCommentId,
        feedbackReceivedAt: input.feedbackReceivedAt,
      },
    });
  }

  async approve(input: {
    id: string;
    approvedBy: string;
    approvedByUserId: string | null;
    approvalComment: string;
    approvedAt: Date;
  }) {
    const row = await this.prisma.baReviewCycle.update({
      where: { id: input.id },
      data: {
        approvalStatus: 'APPROVED',
        approvedBy: input.approvedBy,
        approvedByUserId: input.approvedByUserId,
        approvalComment: input.approvalComment,
        approvedAt: input.approvedAt,
      },
    });
    return toBaReviewCycleEntity(row);
  }

  async listProcessedFeedbackCommentIds(storyId: string): Promise<string[]> {
    const rows = await this.prisma.baReviewCycle.findMany({
      where: { storyId, feedbackJiraCommentId: { not: null } },
      select: { feedbackJiraCommentId: true },
    });
    return rows.map((row) => row.feedbackJiraCommentId).filter((id): id is string => id !== null);
  }
}
