'use client';

import { CheckCircle2, FileText, MessageSquare, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { useReviewTimeline } from '@/features/ba-review/api';
import type { BaReviewCycle } from '@/features/ba-review/types';

// Chronological Review Timeline (spec requirement): every review cycle, each showing Version
// Number, AI Generation Time, BA Feedback, Improvement Summary, Approval Status, Reviewer Name,
// and the attached test case document (linked via jiraAttachmentId's presence).
export function ReviewTimeline({ storyId }: { storyId: string }) {
  const { data: cycles, isLoading } = useReviewTimeline(storyId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Review Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !cycles || cycles.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No review cycles yet"
            description="Generate test cases for this story to start the BA review workflow."
          />
        ) : (
          <ol className="space-y-4">
            {cycles.map((cycle) => (
              <TimelineEntry key={cycle.id} cycle={cycle} />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function TimelineEntry({ cycle }: { cycle: BaReviewCycle }) {
  return (
    <li className="rounded-md border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{cycle.documentVersionLabel}</Badge>
          <span className="text-xs text-muted-foreground">
            Generated {new Date(cycle.generatedAt).toLocaleString()} · {cycle.aiProvider}/{cycle.aiModelVersion}
          </span>
        </div>
        <ApprovalStatusBadge status={cycle.approvalStatus} />
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>{cycle.totalTestCases} test cases</span>
        {cycle.coveragePercent !== null ? <span>Coverage {cycle.coveragePercent.toFixed(1)}%</span> : null}
        {cycle.automationReadinessPercent !== null ? (
          <span>Automation readiness {cycle.automationReadinessPercent.toFixed(1)}%</span>
        ) : null}
        {cycle.jiraAttachmentId ? <span>Document attached to Jira</span> : null}
      </div>

      {cycle.improvementSummary ? (
        <div className="mt-2 flex items-start gap-1.5 rounded bg-muted/50 p-2 text-xs">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{cycle.improvementSummary.feedbackSummary}</span>
        </div>
      ) : null}

      {cycle.feedbackText ? (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            <span className="font-medium text-foreground">{cycle.feedbackAuthor}</span>: {cycle.feedbackText}
          </span>
        </div>
      ) : null}

      {cycle.approvalStatus === 'APPROVED' ? (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-success">
          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Approved by {cycle.approvedBy} on {cycle.approvedAt ? new Date(cycle.approvedAt).toLocaleString() : ''}
            {cycle.approvalComment ? ` — "${cycle.approvalComment}"` : ''}
          </span>
        </div>
      ) : null}
    </li>
  );
}

function ApprovalStatusBadge({ status }: { status: BaReviewCycle['approvalStatus'] }) {
  if (status === 'APPROVED') return <Badge variant="success">Approved</Badge>;
  if (status === 'FEEDBACK_RECEIVED') return <Badge variant="warning">Feedback Received</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}
