import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  IBaReviewJiraCommentRepository,
  UpsertBaReviewJiraCommentInput,
} from '../../domain/repositories/ba-review-jira-comment.repository.interface';
import { toBaReviewJiraCommentEntity } from '../mappers';

@Injectable()
export class PrismaBaReviewJiraCommentRepository implements IBaReviewJiraCommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertMany(storyId: string, organizationId: string, comments: UpsertBaReviewJiraCommentInput[]): Promise<void> {
    if (comments.length === 0) return;

    // Each upsert is independently idempotent on (storyId, jiraCommentId), so these don't need to
    // be wrapped in a single interactive transaction -- a partial failure just gets retried
    // whole on the next poll.
    await Promise.all(
      comments.map((comment) =>
        this.prisma.baReviewJiraComment.upsert({
          where: { storyId_jiraCommentId: { storyId, jiraCommentId: comment.jiraCommentId } },
          create: {
            storyId,
            organizationId,
            jiraCommentId: comment.jiraCommentId,
            authorDisplayName: comment.authorDisplayName,
            authorAccountId: comment.authorAccountId,
            authorAvatarUrl: comment.authorAvatarUrl,
            bodyAdf: comment.bodyAdf as Prisma.InputJsonValue,
            bodyText: comment.bodyText,
            mentionedAccountIds: comment.mentionedAccountIds as unknown as Prisma.InputJsonValue,
            attachmentFilenames: comment.attachmentFilenames as unknown as Prisma.InputJsonValue,
            isOwnComment: comment.isOwnComment,
            classifiedAs: comment.classifiedAs,
            jiraCreatedAt: comment.jiraCreatedAt,
          },
          update: {
            authorDisplayName: comment.authorDisplayName,
            authorAccountId: comment.authorAccountId,
            authorAvatarUrl: comment.authorAvatarUrl,
            bodyAdf: comment.bodyAdf as Prisma.InputJsonValue,
            bodyText: comment.bodyText,
            mentionedAccountIds: comment.mentionedAccountIds as unknown as Prisma.InputJsonValue,
            attachmentFilenames: comment.attachmentFilenames as unknown as Prisma.InputJsonValue,
            isOwnComment: comment.isOwnComment,
            // classifiedAs is intentionally never overwritten by a re-poll -- it's set once, only
            // for the comment ProcessBaReplyCommand actually acted on (see sync-ba-review-threads).
          },
        }),
      ),
    );
  }

  async findByStoryId(storyId: string, organizationId: string) {
    const rows = await this.prisma.baReviewJiraComment.findMany({
      where: { storyId, organizationId },
      orderBy: { jiraCreatedAt: 'asc' },
    });
    return rows.map(toBaReviewJiraCommentEntity);
  }
}
