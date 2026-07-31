'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useIntegrationConnections } from '@/features/integration/api';
import { AddJiraConnectionButton } from '@/features/integration/components/connections-grid';
import type { WizardSelection } from './import-wizard';

interface StepWorkspaceProps {
  selection: WizardSelection;
  onSelect: (patch: Partial<WizardSelection>) => void;
}

export function StepWorkspace({ selection, onSelect }: StepWorkspaceProps) {
  const { data: connections, isLoading } = useIntegrationConnections();
  const connected = connections?.filter((c) => c.status === 'CONNECTED') ?? [];
  const [pickedId, setPickedId] = useState<string | undefined>(selection.connectionId);

  // Preselect the default workspace as soon as the list loads.
  useEffect(() => {
    if (!pickedId && connected.length > 0) {
      const preferred = connected.find((c) => c.isDefault) ?? connected[0];
      if (preferred) setPickedId(preferred.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected.length]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-2 pt-6">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (connected.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Connect a Jira workspace to start importing sprints.
          </p>
          <AddJiraConnectionButton />
        </CardContent>
      </Card>
    );
  }

  const picked = connected.find((c) => c.id === pickedId);

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm font-medium">Select a workspace</p>
        <div className="space-y-2">
          {connected.map((connection) => (
            <button
              key={connection.id}
              type="button"
              onClick={() => setPickedId(connection.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent',
                pickedId === connection.id && 'border-primary bg-accent',
              )}
            >
              <span className="flex items-center gap-2">
                {connection.name}
                {connection.isDefault ? <Star className="h-3.5 w-3.5 fill-current text-muted-foreground" /> : null}
              </span>
              <span className="text-xs text-muted-foreground">{connection.siteUrl.replace(/^https?:\/\//, '')}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button
            disabled={!picked}
            onClick={() =>
              picked && onSelect({ connectionId: picked.id, connectionName: picked.name })
            }
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
