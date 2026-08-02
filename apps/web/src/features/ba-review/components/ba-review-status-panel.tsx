'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import {
  useApproveReviewCycle,
  useBaReviewStatus,
  useRequestChanges,
  useSyncBaReviewNow,
} from '@/features/ba-review/api';
import { BaAssignmentField } from './ba-assignment-field';
import { SyncStatusIndicator } from './sync-status-indicator';
import { AdminUnlockDialog } from './admin-unlock-dialog';

const STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: 'Pending Review',
  AWAITING_APPROVAL: 'Awaiting Approval',
  FEEDBACK_RECEIVED: 'Feedback Received',
  REGENERATION_IN_PROGRESS: 'Regeneration In Progress',
  APPROVED: 'Approved',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'warning' | 'success' | 'outline'> = {
  PENDING_REVIEW: 'outline',
  AWAITING_APPROVAL: 'default',
  FEEDBACK_RECEIVED: 'warning',
  REGENERATION_IN_PROGRESS: 'warning',
  APPROVED: 'success',
};

interface BaReviewStatusPanelProps {
  storyId: string;
  canApprove: boolean;
  canAdminUnlock: boolean;
}

// Dedicated "BA Review Status" panel (spec requirement): Review Status, Current Version, Latest
// Reviewer, Last Review Time, Number of Review Cycles, Approval Progress, Locked Status -- plus
// the approve/request-changes actions and BA assignment/sync-status affordances live here too,
// since they're all facets of the same governance surface.
export function BaReviewStatusPanel({ storyId, canApprove, canAdminUnlock }: BaReviewStatusPanelProps) {
  const { data: status, isLoading } = useBaReviewStatus(storyId);
  const approve = useApproveReviewCycle(storyId);
  const requestChanges = useRequestChanges(storyId);
  const syncNow = useSyncBaReviewNow(storyId);
  const [approvalComment, setApprovalComment] = useState('');
  const [feedbackText, setFeedbackText] = useState('');

  if (isLoading || !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">BA Review Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const onApprove = () =>
    approve.mutate(approvalComment || 'Approved', {
      onSuccess: () => {
        toast({ title: 'Test cases approved', description: 'The baseline is now locked for this story.' });
        setApprovalComment('');
      },
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not approve',
          description: error instanceof ApiError ? error.message : undefined,
        }),
    });

  const onRequestChanges = () =>
    requestChanges.mutate(feedbackText, {
      onSuccess: () => {
        toast({ title: 'Feedback submitted', description: 'SprintGuard AI is regenerating the affected test cases.' });
        setFeedbackText('');
      },
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not submit feedback',
          description: error instanceof ApiError ? error.message : undefined,
        }),
    });

  const onSyncNow = () =>
    syncNow.mutate(undefined, {
      onSuccess: (result) =>
        toast({
          title: 'Synced with Jira',
          description: result.repliesFound > 0 ? 'A new reply was found and processed.' : 'No new replies found.',
        }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Sync failed',
          description: error instanceof ApiError ? error.message : undefined,
        }),
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" /> BA Review Status
        </CardTitle>
        <SyncStatusIndicator storyId={storyId} onSyncNow={onSyncNow} isSyncing={syncNow.isPending} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Field label="Review Status">
            <Badge variant={STATUS_VARIANT[status.status] ?? 'outline'}>{STATUS_LABEL[status.status] ?? status.status}</Badge>
          </Field>
          <Field label="Current Version">{status.activeCycle?.documentVersionLabel ?? `V${status.currentVersion}`}</Field>
          <Field label="Latest Reviewer">{status.latestReviewerName ?? '—'}</Field>
          <Field label="Last Review Time">{status.lastReviewAt ? new Date(status.lastReviewAt).toLocaleString() : '—'}</Field>
          <Field label="Review Cycles">{status.reviewCycleCount}</Field>
          <Field label="Locked Status">{status.isLocked ? 'Locked (Approved)' : 'Unlocked'}</Field>
        </div>

        <BaAssignmentField storyId={storyId} assignedBaEmail={status.assignedBaEmail} />

        {status.isLocked ? (
          canAdminUnlock ? <AdminUnlockDialog storyId={storyId} /> : null
        ) : status.activeCycle ? (
          <div className="space-y-3 border-t pt-3">
            {canApprove ? (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Approve these test cases</p>
                  <div className="flex gap-2">
                    <Textarea
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder="Optional approval comment…"
                      className="min-h-[38px]"
                    />
                    <Button onClick={onApprove} disabled={approve.isPending} className="shrink-0">
                      {approve.isPending ? 'Approving…' : 'Approve'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Or request changes</p>
                  <div className="flex gap-2">
                    <Textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Describe what needs to change…"
                    />
                    <Button
                      variant="outline"
                      onClick={onRequestChanges}
                      disabled={requestChanges.isPending || !feedbackText.trim()}
                      className="shrink-0"
                    >
                      {requestChanges.isPending ? 'Submitting…' : 'Request changes'}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Awaiting review from the assigned Business Analyst on Jira (or via this panel, if you have review
                permission).
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium">{children}</div>
    </div>
  );
}
