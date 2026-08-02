'use client';

import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBaReviewSyncLogs } from '@/features/ba-review/api';

// Shows Jira sync status ("show synchronization status in the application", spec requirement) and
// a manual "Sync now" trigger, using the most recent BaReviewSyncLog rows.
export function SyncStatusIndicator({
  storyId,
  onSyncNow,
  isSyncing,
}: {
  storyId: string;
  onSyncNow: () => void;
  isSyncing: boolean;
}) {
  const { data: logs } = useBaReviewSyncLogs(storyId);
  const latest = logs?.[0];

  return (
    <div className="flex items-center gap-2">
      {latest ? (
        latest.status === 'SUCCESS' ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Synced
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" /> Sync failed
          </Badge>
        )
      ) : null}
      <Button variant="ghost" size="sm" onClick={onSyncNow} disabled={isSyncing}>
        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
