'use client';

import { History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { useAuditTrail } from '@/features/ba-review/api';
import type { AuditTrailEntry } from '@/features/ba-review/types';

const ACTION_LABELS: Record<string, string> = {
  'ba_review.cycle_generated': 'Test cases generated',
  'ba_review.regenerated_from_feedback': 'Regenerated from feedback',
  'ba_review.submitted_manually': 'Submitted for review',
  'ba_review.feedback_received': 'Feedback received',
  'ba_review.approved': 'Approved',
  'ba_review.admin_unlock': 'Admin unlock',
  'ba_review.assignment_updated': 'BA assignment updated',
  'ba_review.test_cases_exported': 'Test cases exported',
};

// Every governance-affecting event for this story, oldest data already captured by AuditLog --
// this just surfaces it per-story instead of only through the platform-wide Admin Console.
export function AuditTrailPanel({ storyId }: { storyId: string }) {
  const { data: entries, isLoading } = useAuditTrail(storyId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Audit Trail</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !entries || entries.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity yet"
            description="Every generation, submission, approval, and feedback event for this story will appear here."
          />
        ) : (
          <ol className="space-y-2">
            {entries.map((entry) => (
              <AuditEntryRow key={entry.id} entry={entry} />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function AuditEntryRow({ entry }: { entry: AuditTrailEntry }) {
  const hasDetail = entry.before !== null || entry.after !== null;
  return (
    <li className="rounded-md border p-2.5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>
        <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
      </div>
      <p className="text-xs text-muted-foreground">{entry.actorEmail ?? 'System'}</p>
      {hasDetail ? (
        <details className="mt-1">
          <summary className="cursor-pointer text-xs text-muted-foreground">Details</summary>
          <pre className="mt-1 overflow-x-auto rounded bg-muted/50 p-2 text-xs">
            {JSON.stringify(entry.after ?? entry.before, null, 2)}
          </pre>
        </details>
      ) : null}
    </li>
  );
}
