'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, FileQuestion } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSprint } from '@/features/sprint/api';
import { StoryPicker } from '@/features/sprint/components';
import { useExecutionsByStory } from '@/features/execution/api';
import { StoryExecutionCard } from '@/features/execution/components';
import { useSelectedStoryStore, useSelectedStoryForSprint } from '@/stores/selected-story-store';
import { ApiError } from '@/lib/api-client';

const statusVariant: Record<string, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  PASSED: 'success',
  FAILED: 'destructive',
  BLOCKED: 'warning',
  SKIPPED: 'secondary',
};

// Bug 1: only the globally-selected story is executed/recorded here.
export default function ExecutionDashboardPage() {
  const params = useParams<{ sprintId: string }>();
  const { data: sprint, isLoading, isError, error } = useSprint(params.sprintId);
  const selectedStoryId = useSelectedStoryForSprint(params.sprintId);
  const selectStory = useSelectedStoryStore((s) => s.selectStory);

  useEffect(() => {
    if (!selectedStoryId && sprint?.stories[0]) {
      selectStory(params.sprintId, sprint.stories[0].id);
    }
  }, [sprint, selectedStoryId, params.sprintId, selectStory]);

  const selectedStory = sprint?.stories.find((s) => s.id === selectedStoryId) ?? sprint?.stories[0] ?? null;
  const { data: executions } = useExecutionsByStory(selectedStory?.id ?? null);

  return (
    <div>
      <PageHeader title="Manual Execution" description="Record and review manual test execution results for the selected user story." />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError || !sprint ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t load this sprint</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'The sprint could not be found.'}
          </AlertDescription>
        </Alert>
      ) : sprint.stories.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No stories in this sprint"
          description="Import a sprint with stories to record executions."
        />
      ) : (
        <div className="space-y-4">
          <StoryPicker
            stories={sprint.stories}
            value={selectedStory?.id ?? null}
            onChange={(storyId) => selectStory(params.sprintId, storyId)}
          />

          {selectedStory ? <StoryExecutionCard story={selectedStory} sprintId={params.sprintId} /> : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Execution history</CardTitle>
            </CardHeader>
            <CardContent>
              {!executions || executions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No executions recorded yet for this story.</p>
              ) : (
                <ul className="divide-y">
                  {executions.map((execution) => (
                    <li key={execution.id} className="flex items-center justify-between gap-4 py-2">
                      <div>
                        <p className="text-sm font-medium">{execution.testCaseTitle}</p>
                        {execution.executedAt ? (
                          <p className="text-xs text-muted-foreground">
                            {new Date(execution.executedAt).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant={statusVariant[execution.status] ?? 'secondary'}>{execution.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
