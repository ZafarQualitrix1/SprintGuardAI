'use client';

import Link from 'next/link';
import { Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { useSprints } from '@/features/sprint/api';
import type { Project } from '@sprintguard/shared';

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
              <li key={sprint.id} className="flex items-center justify-between py-2">
                <Link
                  href={`/dashboard/sprints/${sprint.id}` as never}
                  className="text-sm font-medium hover:underline"
                >
                  {sprint.name}
                </Link>
                <Badge variant={statusVariant[sprint.status] ?? 'default'}>{sprint.status}</Badge>
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
