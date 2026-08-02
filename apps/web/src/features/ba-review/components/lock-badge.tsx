'use client';

import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { BaReviewStatusSummary } from '../types';

// Header-level indicator: lock icon + "Approved" badge with approver/timestamp/comment/version,
// shown once a story's test cases are BA-approved and the AI generation workflow is locked.
export function LockBadge({ status }: { status: BaReviewStatusSummary }) {
  if (!status.isLocked) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm">
      <Lock className="h-4 w-4 text-success" />
      <Badge variant="success">Approved &amp; Locked</Badge>
      <span className="text-muted-foreground">
        {status.lockedVersionLabel ? `${status.lockedVersionLabel} · ` : ''}
        {status.approvedBy ? `approved by ${status.approvedBy}` : 'approved'}
        {status.lockedAt ? ` on ${new Date(status.lockedAt).toLocaleString()}` : ''}
      </span>
      {status.approvalComment ? (
        <span className="italic text-muted-foreground">&ldquo;{status.approvalComment}&rdquo;</span>
      ) : null}
    </div>
  );
}
