'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, FileQuestion } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useSprint } from '@/features/sprint/api';
import { StoryPicker } from '@/features/sprint/components';
import { StoryRequirementsCard } from '@/features/requirement-intelligence/components';
import { useSelectedStoryStore, useSelectedStoryForSprint } from '@/stores/selected-story-store';
import { ApiError } from '@/lib/api-client';

// Bug 1/Bug 2: only the globally-selected story is analyzed here -- switching stories via the
// dropdown updates the same global selection every other module reads, so Test Generator/
// Coverage/Execution stay in sync without the user having to re-pick a story on every tab.
export default function RequirementIntelligencePage() {
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

  return (
    <div>
      <PageHeader
        title="Requirement Intelligence"
        description="Extracted requirements and acceptance criteria for the selected user story."
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
          description="Import a sprint with stories to run Requirement Intelligence."
        />
      ) : (
        <div className="space-y-4">
          <StoryPicker
            stories={sprint.stories}
            value={selectedStory?.id ?? null}
            onChange={(storyId) => selectStory(params.sprintId, storyId)}
          />
          {selectedStory ? <StoryRequirementsCard story={selectedStory} /> : null}
        </div>
      )}
    </div>
  );
}
