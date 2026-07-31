'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useExternalProjects } from '@/features/integration/api';
import type { WizardSelection } from './import-wizard';

interface StepProjectProps {
  selection: WizardSelection;
  onSelect: (patch: Partial<WizardSelection>) => void;
  onBack: () => void;
}

export function StepProject({ selection, onSelect, onBack }: StepProjectProps) {
  const { data: projects, isLoading, isError, refetch } = useExternalProjects(selection.connectionId);
  const [search, setSearch] = useState('');
  const [pickedKey, setPickedKey] = useState<string | undefined>(selection.jiraProjectKey);

  const filtered = (projects ?? []).filter((p) =>
    `${p.name} ${p.externalKey}`.toLowerCase().includes(search.toLowerCase()),
  );
  const picked = filtered.find((p) => p.externalKey === pickedKey) ?? projects?.find((p) => p.externalKey === pickedKey);

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm font-medium">Select a Jira project</p>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">Could not load projects for this workspace.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (projects?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            No projects found yet -- try Sync Now on this connection from the Dashboard.
          </p>
        ) : (
          <>
            <Input
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {filtered.map((project) => (
                <button
                  key={project.externalKey}
                  type="button"
                  onClick={() => setPickedKey(project.externalKey)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent',
                    pickedKey === project.externalKey && 'border-primary bg-accent',
                  )}
                >
                  <span className="truncate">{project.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">{project.externalKey}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            disabled={!picked}
            onClick={() =>
              picked && onSelect({ jiraProjectKey: picked.externalKey, jiraProjectName: picked.name })
            }
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
