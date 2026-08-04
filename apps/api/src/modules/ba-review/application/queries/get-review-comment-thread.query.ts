import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  BA_REVIEW_JIRA_COMMENT_REPOSITORY,
  IBaReviewJiraCommentRepository,
} from '../../domain/repositories/ba-review-jira-comment.repository.interface';
import { BaReviewJiraCommentEntity } from '../../domain/entities/ba-review-jira-comment.entity';

export class GetReviewCommentThreadQuery {
  constructor(
    public readonly storyId: string,
    public readonly organizationId: string,
  ) {}
}

@QueryHandler(GetReviewCommentThreadQuery)
export class GetReviewCommentThreadHandler
  implements IQueryHandler<GetReviewCommentThreadQuery, BaReviewJiraCommentEntity[]>
{
  constructor(
    @Inject(BA_REVIEW_JIRA_COMMENT_REPOSITORY)
    private readonly commentRepository: IBaReviewJiraCommentRepository,
  ) {}

  execute(query: GetReviewCommentThreadQuery): Promise<BaReviewJiraCommentEntity[]> {
    return this.commentRepository.findByStoryId(query.storyId, query.organizationId);
  }
}
