'use client';

import { useParams } from 'next/navigation';
import { AlertCircle, FileQuestion } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useSprint } from '@/features/sprint/api';
import { StoryTestGeneratorCard } from '@/features/test-intelligence/components';
import { ApiError } from '@/lib/api-client';

export default function AiTestGeneratorPage() {
  const params = useParams<{ sprintId: string }>();
  const { data: sprint, isLoading, isError, error } = useSprint(params.sprintId);

  return (
    <div>
      <PageHeader
        title="AI Test Generator"
        description="Generate and review AI test scenarios and cases for this sprint's stories."
      />

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
          description="Import a sprint with stories to generate tests."
        />
      ) : (
        <div className="space-y-4">
          {sprint.stories.map((story) => (
            <StoryTestGeneratorCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}
