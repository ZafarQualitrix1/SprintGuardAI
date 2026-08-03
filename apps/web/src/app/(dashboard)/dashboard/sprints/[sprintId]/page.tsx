'use client';

import { useParams } from 'next/navigation';
import { AlertCircle, ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSprint } from '@/features/sprint/api';
import { StoryProgressRow } from '@/features/sprint/components';
import { ApiError } from '@/lib/api-client';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Bug 1: the sprint dashboard is now the single entry point into the user-story-driven workflow --
// select ONE story here (row click or a stage badge) and every downstream module (Requirement
// Intelligence, Test Generator, Coverage, Manual Execution, Release Readiness) operates on just
// that story from then on, instead of rendering every story in the sprint at once.
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
        description={sprint.goal ?? 'Select a user story below to start its AI-driven QA workflow.'}
        actions={<Badge variant={sprint.status === 'ACTIVE' ? 'success' : 'secondary'}>{sprint.status}</Badge>}
      />

      <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>Start: {formatDate(sprint.startDate)}</span>
        <span>End: {formatDate(sprint.endDate)}</span>
        <span>Source: {sprint.source}</span>
        <span>{sprint.stories.length} stories</span>
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
                    <th className="py-2 pr-4 font-medium">Assignee</th>
                    <th className="py-2 font-medium">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sprint.stories.map((story) => (
                    <StoryProgressRow key={story.id} sprintId={sprint.id} story={story} jiraSiteUrl={sprint.jiraSiteUrl} />
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
