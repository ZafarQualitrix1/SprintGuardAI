'use client';

import { useState } from 'react';
import type { IntegrationConnection } from '@sprintguard/shared';
import Link from 'next/link';
import {
  ExternalLink,
  FolderOpen,
  MoreVertical,
  Pencil,
  RefreshCw,
  Star,
  Unplug,
  Upload,
  Wifi,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import {
  useExternalProjects,
  useSetDefaultConnection,
  useSyncConnection,
  useTestConnection,
} from '@/features/integration/api';
import { ConnectionFormDialog } from './connection-form-dialog';
import { DisconnectConnectionDialog } from './disconnect-connection-dialog';

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
  return rtf.format(Math.round(diffHr / 24), 'day');
}

function statusBadgeVariant(status: string): 'success' | 'warning' | 'destructive' | 'outline' {
  if (status === 'CONNECTED') return 'success';
  if (status === 'ERROR') return 'warning';
  if (status === 'DISCONNECTED') return 'destructive';
  return 'outline';
}

// 🟢 Connected / 🟡 Needs reauthentication / 🔴 Disconnected / ⚪ Never synced
function healthDot(healthStatus: string): string {
  if (healthStatus === 'HEALTHY') return '🟢';
  if (healthStatus === 'DEGRADED') return '🟡';
  if (healthStatus === 'UNHEALTHY') return '🔴';
  return '⚪';
}

interface ConnectionCardProps {
  connection: IntegrationConnection;
}

export function ConnectionCard({ connection }: ConnectionCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  const test = useTestConnection();
  const sync = useSyncConnection();
  const setDefault = useSetDefaultConnection();

  const handleTest = () =>
    test.mutate(connection.id, {
      onSuccess: (result) =>
        toast({
          title: result.healthStatus === 'HEALTHY' ? 'Connection healthy' : 'Connection unhealthy',
          description: result.error ?? `${connection.name} responded successfully.`,
          variant: result.healthStatus === 'HEALTHY' ? 'default' : 'destructive',
        }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Test failed',
          description: error instanceof ApiError ? error.message : 'Could not test this connection.',
        }),
    });

  const handleSync = () =>
    sync.mutate(connection.id, {
      onSuccess: (result) =>
        toast({ title: 'Synced', description: `Found ${result.projectCount} project(s).` }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Sync failed',
          description: error instanceof ApiError ? error.message : 'Could not sync this connection.',
        }),
    });

  const handleSetDefault = () =>
    setDefault.mutate(connection.id, {
      onSuccess: () => toast({ title: 'Default workspace updated', description: connection.name }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not set default',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold leading-none">{connection.name}</h3>
              {connection.isDefault ? (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 fill-current" /> Default
                </Badge>
              ) : null}
            </div>
            <a
              href={connection.siteUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {connection.siteUrl.replace(/^https?:\/\//, '')}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Connection actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setProjectsOpen((v) => !v)}>
                <FolderOpen className="mr-2 h-4 w-4" /> {projectsOpen ? 'Hide projects' : 'Open projects'}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/sprints/upload">
                  <Upload className="mr-2 h-4 w-4" /> Import sprint
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleSync} disabled={sync.isPending}>
                <RefreshCw className="mr-2 h-4 w-4" /> {sync.isPending ? 'Syncing…' : 'Sync now'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleTest} disabled={test.isPending}>
                <Wifi className="mr-2 h-4 w-4" /> {test.isPending ? 'Testing…' : 'Test connection'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Update connection
              </DropdownMenuItem>
              {!connection.isDefault ? (
                <DropdownMenuItem onSelect={handleSetDefault} disabled={setDefault.isPending}>
                  <Star className="mr-2 h-4 w-4" /> Set as default
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setDisconnectOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Unplug className="mr-2 h-4 w-4" /> Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="flex-1 space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusBadgeVariant(connection.status)}>{connection.status}</Badge>
            <span className="text-xs text-muted-foreground">
              {healthDot(connection.healthStatus)} {connection.healthStatus}
            </span>
          </div>
          {connection.email ? (
            <p className="truncate text-xs text-muted-foreground">{connection.email}</p>
          ) : null}
          <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <dt>Last sync</dt>
            <dd className="text-right">{timeAgo(connection.lastSyncedAt)}</dd>
            <dt>Last checked</dt>
            <dd className="text-right">{timeAgo(connection.lastHealthCheckAt)}</dd>
          </dl>
          {projectsOpen ? <ConnectionProjectsPanel connectionId={connection.id} /> : null}
        </CardContent>
        <CardFooter className="text-[11px] text-muted-foreground">
          Connected {new Date(connection.createdAt).toLocaleDateString()}
        </CardFooter>
      </Card>

      <ConnectionFormDialog mode="update" connection={connection} open={editOpen} onOpenChange={setEditOpen} />
      <DisconnectConnectionDialog
        connection={connection}
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
      />
    </>
  );
}

function ConnectionProjectsPanel({ connectionId }: { connectionId: string }) {
  const { data, isLoading, isError } = useExternalProjects(connectionId);

  if (isLoading) {
    return (
      <div className="space-y-1.5 border-t pt-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (isError) {
    return <p className="border-t pt-2 text-xs text-destructive">Could not load projects.</p>;
  }

  if (!data || data.length === 0) {
    return (
      <p className="border-t pt-2 text-xs text-muted-foreground">
        No projects cached yet -- try Sync Now.
      </p>
    );
  }

  return (
    <ul className="max-h-40 space-y-1 overflow-y-auto border-t pt-2">
      {data.map((project) => (
        <li key={project.externalKey} className="flex items-center justify-between text-xs">
          <span className="truncate">{project.name}</span>
          <span className="ml-2 shrink-0 text-muted-foreground">{project.externalKey}</span>
        </li>
      ))}
    </ul>
  );
}
