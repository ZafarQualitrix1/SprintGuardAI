'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSprint } from '@/features/sprint/api';
import { ApiError } from '@/lib/api-client';

const relatedPages = [
  { label: 'Requirement Intelligence', suffix: 'requirements' },
  { label: 'Coverage', suffix: 'coverage' },
  { label: 'AI Test Generator', suffix: 'test-generator' },
  { label: 'Executions', suffix: 'executions' },
  { label: 'Release Readiness', suffix: 'release-readiness' },
] as const;

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function SprintAnalysisPage() {
  const params = useParams<{ sprintId: string }>();
  const { data: sprint, isLoading, isError, error } = useSprint(params.sprintId);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Sprint Analysis" description="Loading sprint…" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !sprint) {
    return (
      <div>
        <PageHeader title="Sprint Analysis" description="AI-analyzed stories for this sprint." />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t load this sprint</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'The sprint could not be found.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={sprint.name}
        description={sprint.goal ?? 'AI-analyzed stories, risks, and dependencies for this sprint.'}
        actions={<Badge variant={sprint.status === 'ACTIVE' ? 'success' : 'secondary'}>{sprint.status}</Badge>}
      />

      <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>Start: {formatDate(sprint.startDate)}</span>
        <span>End: {formatDate(sprint.endDate)}</span>
        <span>Source: {sprint.source}</span>
        <span>{sprint.stories.length} stories</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {relatedPages.map((page) => (
          <Link
            key={page.suffix}
            href={`/dashboard/sprints/${sprint.id}/${page.suffix}` as never}
            className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {page.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {sprint.stories.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No stories in this sprint"
              description="This sprint was imported without any stories."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Story</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Points</th>
                    <th className="py-2 pr-4 font-medium">Priority</th>
                    <th className="py-2 font-medium">Assignee</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sprint.stories.map((story) => (
                    <tr key={story.id}>
                      <td className="py-2 pr-4">
                        <div className="font-medium">{story.title}</div>
                        {story.externalId ? (
                          <div className="font-mono text-xs text-muted-foreground">{story.externalId}</div>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary">{story.status}</Badge>
                      </td>
                      <td className="py-2 pr-4">{story.storyPoints ?? '—'}</td>
                      <td className="py-2 pr-4">{story.priority ?? '—'}</td>
                      <td className="py-2">{story.assignee ?? 'Unassigned'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
