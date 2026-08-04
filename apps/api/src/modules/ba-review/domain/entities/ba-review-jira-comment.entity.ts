export type BaReviewCommentClassification = 'APPROVAL' | 'FEEDBACK';

export class BaReviewJiraCommentEntity {
  constructor(
    public readonly id: string,
    public readonly storyId: string,
    public readonly organizationId: string,
    public readonly jiraCommentId: string,
    public readonly authorDisplayName: string | null,
    public readonly authorAccountId: string | null,
    public readonly authorAvatarUrl: string | null,
    public readonly bodyAdf: unknown,
    public readonly bodyText: string,
    public readonly mentionedAccountIds: string[],
    public readonly attachmentFilenames: string[],
    public readonly isOwnComment: boolean,
    public readonly classifiedAs: BaReviewCommentClassification | null,
    public readonly jiraCreatedAt: Date | null,
    public readonly createdAt: Date,
  ) {}
}
