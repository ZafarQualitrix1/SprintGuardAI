'use client';

import { MessageCircle, Paperclip } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { useReviewCommentThread } from '@/features/ba-review/api';
import type { BaReviewJiraComment } from '@/features/ba-review/types';

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Real Jira comment-thread mirror (additive to ReviewTimeline's per-version rollup) -- every
// comment SyncBaReviewThreadsCommand has seen on the issue, refreshed every 30s while this page is
// open so it stays close to live without needing a Jira webhook (this integration is polling-only).
export function ReviewCommentThread({ storyId }: { storyId: string }) {
  const { data: comments, isLoading } = useReviewCommentThread(storyId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Jira Comment Thread</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !comments || comments.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No comments yet"
            description="Comments posted on this story's Jira issue will mirror here once SprintGuard AI syncs."
          />
        ) : (
          <ol className="space-y-3">
            {comments.map((comment) => (
              <CommentEntry key={comment.id} comment={comment} />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function CommentEntry({ comment }: { comment: BaReviewJiraComment }) {
  const author = comment.authorDisplayName ?? 'Unknown';
  return (
    <li className="flex gap-2.5 rounded-md border p-3">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={comment.authorAvatarUrl ?? undefined} alt="" />
        <AvatarFallback className="text-[10px]">{initials(author)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{author}</span>
          {comment.isOwnComment ? <Badge variant="outline">SprintGuard AI</Badge> : null}
          {comment.classifiedAs === 'APPROVAL' ? <Badge variant="success">Approval</Badge> : null}
          {comment.classifiedAs === 'FEEDBACK' ? <Badge variant="warning">Feedback</Badge> : null}
          <span className="text-xs text-muted-foreground">
            {comment.jiraCreatedAt ? new Date(comment.jiraCreatedAt).toLocaleString() : ''}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{comment.bodyText}</p>
        {comment.attachmentFilenames.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {comment.attachmentFilenames.map((filename) => (
              <Badge key={filename} variant="secondary" className="gap-1 font-normal">
                <Paperclip className="h-3 w-3" /> {filename}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}
