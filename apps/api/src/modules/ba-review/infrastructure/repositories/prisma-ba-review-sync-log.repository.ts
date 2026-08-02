import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { IBaReviewSyncLogRepository } from '../../domain/repositories/ba-review-sync-log.repository.interface';
import { toBaReviewSyncLogEntity } from '../mappers';

const DEFAULT_LIMIT = 50;

@Injectable()
export class PrismaBaReviewSyncLogRepository implements IBaReviewSyncLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    storyId: string;
    organizationId: string;
    reviewCycleId: string | null;
    action: 'RESOLVE_BA_ACCOUNT' | 'POST_INITIAL_COMMENT' | 'UPLOAD_ATTACHMENT' | 'POLL_REPLIES' | 'POST_FOLLOWUP_COMMENT';
    status: 'SUCCESS' | 'FAILED';
    attempt: number;
    errorMessage: string | null;
  }): Promise<void> {
    await this.prisma.baReviewSyncLog.create({
      data: {
        storyId: input.storyId,
        organizationId: input.organizationId,
        reviewCycleId: input.reviewCycleId,
        action: input.action,
        status: input.status,
        attempt: input.attempt,
        errorMessage: input.errorMessage,
      },
    });
  }

  async findByStoryId(storyId: string, organizationId: string, limit: number = DEFAULT_LIMIT) {
    const rows = await this.prisma.baReviewSyncLog.findMany({
      where: { storyId, organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toBaReviewSyncLogEntity);
  }
}
