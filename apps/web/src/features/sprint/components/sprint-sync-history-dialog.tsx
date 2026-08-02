'use client';

import type { Sprint } from '@sprintguard/shared';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { History } from 'lucide-react';
import { useSprintSyncHistory } from '@/features/sprint/api';

interface SprintSyncHistoryDialogProps {
  sprint: Sprint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_LABEL: Record<string, string> = {
  IMPORT: 'Imported',
  SYNC: 'Synced',
  OVERRIDE: 'Overridden',
  RENAME: 'Renamed',
  ARCHIVE: 'Archived',
  UNARCHIVE: 'Unarchived',
  DELETE: 'Deleted',
};

export function SprintSyncHistoryDialog({ sprint, open, onOpenChange }: SprintSyncHistoryDialogProps) {
  const { data: events, isLoading } = useSprintSyncHistory(sprint.id, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sync history — {sprint.name}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !events?.length ? (
          <EmptyState icon={History} title="No sync activity yet" description="Import, sync, and override events for this sprint will appear here." />
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-4 rounded-md border p-2">
                <div>
                  <p className="text-sm font-medium">
                    {ACTION_LABEL[event.action] ?? event.action}
                    {event.status === 'FAILED' ? ' — failed' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</p>
                  {event.storiesCreated > 0 || event.storiesUpdated > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {event.storiesCreated} created, {event.storiesUpdated} updated
                    </p>
                  ) : null}
                  {event.errorMessage ? <p className="text-xs text-destructive">{event.errorMessage}</p> : null}
                </div>
                <Badge variant={event.status === 'SUCCESS' ? 'success' : 'destructive'}>{event.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
