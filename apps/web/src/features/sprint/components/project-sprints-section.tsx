'use client';

import Link from 'next/link';
import { Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { useSprints } from '@/features/sprint/api';
import { SprintActionsMenu } from './sprint-actions-menu';
import type { Project } from '@sprintguard/shared';

function lastSyncedLabel(iso: string | null): string | null {
  if (!iso) return null;
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'Synced just now';
  if (diffMin < 60) return `Synced ${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `Synced ${diffHr}h ago`;
  return `Synced ${Math.round(diffHr / 24)}d ago`;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
  ACTIVE: 'success',
  PLANNED: 'secondary',
  COMPLETED: 'default',
  CANCELLED: 'warning',
};

export function ProjectSprintsSection({ project }: { project: Project }) {
  const { data: sprints, isLoading } = useSprints(project.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {project.name}
          <span className="font-mono text-xs font-normal text-muted-foreground">{project.key}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : sprints && sprints.length > 0 ? (
          <ul className="divide-y">
            {sprints.map((sprint) => (
              <li key={sprint.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/sprints/${sprint.id}` as never}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {sprint.name}
                  </Link>
                  {lastSyncedLabel(sprint.lastSyncedAt) ? (
                    <p className="text-xs text-muted-foreground">{lastSyncedLabel(sprint.lastSyncedAt)}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={statusVariant[sprint.status] ?? 'default'}>{sprint.status}</Badge>
                  <SprintActionsMenu sprint={sprint} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Rocket}
            title="No sprints imported yet"
            description="Import a sprint from Jira to see it here."
          />
        )}
      </CardContent>
    </Card>
  );
}
