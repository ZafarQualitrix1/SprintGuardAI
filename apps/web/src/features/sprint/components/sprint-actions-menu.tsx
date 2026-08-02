'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Sprint } from '@sprintguard/shared';
import { Archive, ExternalLink, History, MoreVertical, Pencil, RefreshCw, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useArchiveSprint, useSyncSprint } from '@/features/sprint/api';
import { RenameSprintDialog } from './rename-sprint-dialog';
import { OverrideSprintDialog } from './override-sprint-dialog';
import { DeleteSprintDialog } from './delete-sprint-dialog';
import { SprintSyncHistoryDialog } from './sprint-sync-history-dialog';

interface SprintActionsMenuProps {
  sprint: Sprint;
}

export function SprintActionsMenu({ sprint }: SprintActionsMenuProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const sync = useSyncSprint(sprint.projectId);
  const archive = useArchiveSprint(sprint.projectId);

  const handleSync = () => {
    sync.mutate(sprint.id, {
      onSuccess: (updated) =>
        toast({
          title: 'Sprint synced',
          description: `Now ${updated.stories.length} stories, up to date with Jira.`,
        }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not sync sprint',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });
  };

  const handleArchive = () => {
    archive.mutate(
      { sprintId: sprint.id, archived: true },
      {
        onSuccess: () => toast({ title: 'Sprint archived' }),
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not archive sprint',
            description: error instanceof ApiError ? error.message : 'Something went wrong.',
          }),
      },
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Sprint actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/sprints/${sprint.id}` as never}>
              <ExternalLink className="mr-2 h-4 w-4" /> Open sprint
            </Link>
          </DropdownMenuItem>
          {sprint.canSync ? (
            <DropdownMenuItem onSelect={handleSync} disabled={sync.isPending}>
              <RefreshCw className="mr-2 h-4 w-4" /> {sync.isPending ? 'Syncing…' : 'Refresh / sync from Jira'}
            </DropdownMenuItem>
          ) : null}
          {sprint.canSync ? (
            <DropdownMenuItem onSelect={() => setOverrideOpen(true)} className="text-destructive focus:text-destructive">
              <Zap className="mr-2 h-4 w-4" /> Override existing sprint
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Rename sprint
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleArchive} disabled={archive.isPending}>
            <Archive className="mr-2 h-4 w-4" /> {archive.isPending ? 'Archiving…' : 'Archive sprint'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setHistoryOpen(true)}>
            <History className="mr-2 h-4 w-4" /> View sync history
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete sprint
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameSprintDialog sprint={sprint} open={renameOpen} onOpenChange={setRenameOpen} />
      <OverrideSprintDialog sprint={sprint} open={overrideOpen} onOpenChange={setOverrideOpen} />
      <DeleteSprintDialog sprint={sprint} open={deleteOpen} onOpenChange={setDeleteOpen} />
      <SprintSyncHistoryDialog sprint={sprint} open={historyOpen} onOpenChange={setHistoryOpen} />
    </>
  );
}
