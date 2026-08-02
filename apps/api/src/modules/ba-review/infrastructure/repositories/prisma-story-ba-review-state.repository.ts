import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  IStoryBaReviewStateRepository,
} from '../../domain/repositories/story-ba-review-state.repository.interface';
import { BaReviewStatus } from '../../domain/entities/story-ba-review-state.entity';
import { toStoryBaReviewStateEntity } from '../mappers';

@Injectable()
export class PrismaStoryBaReviewStateRepository implements IStoryBaReviewStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByStoryId(storyId: string, organizationId: string) {
    const row = await this.prisma.storyBaReviewState.findFirst({ where: { storyId, organizationId } });
    return row ? toStoryBaReviewStateEntity(row) : null;
  }

  async ensureForStory(storyId: string, organizationId: string) {
    const row = await this.prisma.storyBaReviewState.upsert({
      where: { storyId },
      create: { storyId, organizationId },
      update: {},
    });
    return toStoryBaReviewStateEntity(row);
  }

  async isLocked(storyId: string, organizationId: string): Promise<boolean> {
    const row = await this.prisma.storyBaReviewState.findFirst({
      where: { storyId, organizationId },
      select: { isLocked: true },
    });
    return row?.isLocked ?? false;
  }

  async startNewCycle(storyId: string, reviewCycleId: string, version: number): Promise<void> {
    await this.prisma.storyBaReviewState.update({
      where: { storyId },
      data: {
        activeReviewCycleId: reviewCycleId,
        currentVersion: version,
        status: 'PENDING_REVIEW',
        reviewCycleCount: { increment: 1 },
      },
    });
  }

  async setStatus(storyId: string, status: BaReviewStatus): Promise<void> {
    await this.prisma.storyBaReviewState.update({ where: { storyId }, data: { status } });
  }

  async recordReview(input: {
    storyId: string;
    reviewerName: string;
    reviewerUserId: string | null;
    reviewedAt: Date;
    status: BaReviewStatus;
  }): Promise<void> {
    await this.prisma.storyBaReviewState.update({
      where: { storyId: input.storyId },
      data: {
        status: input.status,
        latestReviewerName: input.reviewerName,
        latestReviewerUserId: input.reviewerUserId,
        lastReviewAt: input.reviewedAt,
      },
    });
  }

  async approveAndLock(input: {
    storyId: string;
    lockedVersionId: string;
    lockedAt: Date;
    reviewerName: string;
    reviewerUserId: string | null;
  }): Promise<void> {
    await this.prisma.storyBaReviewState.update({
      where: { storyId: input.storyId },
      data: {
        status: 'APPROVED',
        isLocked: true,
        lockedVersionId: input.lockedVersionId,
        lockedAt: input.lockedAt,
        latestReviewerName: input.reviewerName,
        latestReviewerUserId: input.reviewerUserId,
        lastReviewAt: input.lockedAt,
        unlockedBy: null,
        unlockedAt: null,
        unlockReason: null,
      },
    });
  }

  async adminUnlock(input: { storyId: string; unlockedBy: string; reason: string }): Promise<void> {
    await this.prisma.storyBaReviewState.update({
      where: { storyId: input.storyId },
      data: {
        isLocked: false,
        unlockedBy: input.unlockedBy,
        unlockedAt: new Date(),
        unlockReason: input.reason,
      },
    });
  }

  async updateBaAssignment(input: {
    storyId: string;
    assignedBaEmail: string | null;
    assignedBaJiraAccountId: string | null;
    assignedBaAccountResolvedAt: Date | null;
  }): Promise<void> {
    await this.prisma.story.update({
      where: { id: input.storyId },
      data: {
        assignedBaEmail: input.assignedBaEmail,
        assignedBaJiraAccountId: input.assignedBaJiraAccountId,
        assignedBaAccountResolvedAt: input.assignedBaAccountResolvedAt,
      },
    });
  }

  async listAwaitingApproval(organizationId?: string) {
    const rows = await this.prisma.storyBaReviewState.findMany({
      where: {
        status: 'AWAITING_APPROVAL',
        ...(organizationId ? { organizationId } : {}),
      },
    });
    return rows.map(toStoryBaReviewStateEntity);
  }
}
