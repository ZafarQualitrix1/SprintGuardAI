'use client';

import { useState } from 'react';
import { Plug, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { useIntegrationConnections } from '@/features/integration/api';
import { ConnectionCard } from './connection-card';
import { ConnectionFormDialog } from './connection-form-dialog';

export function AddJiraConnectionButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" /> Add Jira Connection
      </Button>
      <ConnectionFormDialog mode="create" open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ConnectionsGrid() {
  const { data: connections, isLoading, isError, refetch } = useIntegrationConnections();
  const [addOpen, setAddOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={Plug}
        title="Could not load Jira connections"
        description="Something went wrong fetching your workspaces."
        action={
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!connections || connections.length === 0) {
    return (
      <>
        <EmptyState
          icon={Plug}
          title="No Jira Workspace Connected"
          description="Connect your Jira workspace to import projects, boards, sprints, issues, and generate AI-powered sprint quality insights."
          action={<Button onClick={() => setAddOpen(true)}>Connect Jira</Button>}
        />
        <ConnectionFormDialog mode="create" open={addOpen} onOpenChange={setAddOpen} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddJiraConnectionButton />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {connections.map((connection) => (
          <ConnectionCard key={connection.id} connection={connection} />
        ))}
      </div>
    </div>
  );
}
