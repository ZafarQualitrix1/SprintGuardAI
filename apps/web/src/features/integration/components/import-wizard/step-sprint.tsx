'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useExternalSprints } from '@/features/integration/api';
import type { WizardSelection } from './import-wizard';

interface StepSprintProps {
  selection: WizardSelection;
  onSelect: (patch: Partial<WizardSelection>) => void;
  onBack: () => void;
}

function formatRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const fmt = (d: string) => new Date(d).toLocaleDateString();
  return `${start ? fmt(start) : '?'} – ${end ? fmt(end) : '?'}`;
}

export function StepSprint({ selection, onSelect, onBack }: StepSprintProps) {
  const { data: sprints, isLoading, isError, refetch } = useExternalSprints(
    selection.connectionId,
    selection.boardId,
  );
  const [pickedId, setPickedId] = useState<string | undefined>(selection.sprintExternalId);
  const picked = sprints?.find((s) => s.externalId === pickedId);

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm font-medium">Select a sprint from {selection.boardName}</p>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : isError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">Could not load sprints for this board.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (sprints?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">This board has no active or upcoming sprint.</p>
        ) : (
          <div className="space-y-2">
            {sprints!.map((sprint) => {
              const range = formatRange(sprint.startDate, sprint.endDate);
              return (
                <button
                  key={sprint.externalId}
                  type="button"
                  onClick={() => setPickedId(sprint.externalId)}
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent',
                    pickedId === sprint.externalId && 'border-primary bg-accent',
                  )}
                >
                  <span className="flex w-full items-center justify-between">
                    <span>{sprint.name}</span>
                    <span className="text-xs capitalize text-muted-foreground">{sprint.state}</span>
                  </span>
                  {range ? <span className="text-xs text-muted-foreground">{range}</span> : null}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            disabled={!picked}
            onClick={() => picked && onSelect({ sprintExternalId: picked.externalId, sprintName: picked.name })}
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
