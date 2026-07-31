'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useExternalBoards } from '@/features/integration/api';
import type { WizardSelection } from './import-wizard';

interface StepBoardProps {
  selection: WizardSelection;
  onSelect: (patch: Partial<WizardSelection>) => void;
  onBack: () => void;
}

export function StepBoard({ selection, onSelect, onBack }: StepBoardProps) {
  const { data: boards, isLoading, isError, refetch } = useExternalBoards(
    selection.connectionId,
    selection.jiraProjectKey,
  );
  const [pickedId, setPickedId] = useState<string | undefined>(selection.boardId);
  const picked = boards?.find((b) => b.id === pickedId);

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm font-medium">Select a board in {selection.jiraProjectName}</p>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">Could not load boards for this project.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (boards?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">This project has no boards.</p>
        ) : (
          <div className="space-y-2">
            {boards!.map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() => setPickedId(board.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent',
                  pickedId === board.id && 'border-primary bg-accent',
                )}
              >
                <span>{board.name}</span>
                <span className="text-xs capitalize text-muted-foreground">{board.type}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            disabled={!picked}
            onClick={() => picked && onSelect({ boardId: picked.id, boardName: picked.name })}
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
