'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, FileQuestion, FileSearch, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useSprint } from '@/features/sprint/api';
import { StoryPicker } from '@/features/sprint/components';
import { StoryTestGeneratorCard } from '@/features/test-intelligence/components';
import { ViewFullStoryDrawer } from '@/features/requirement-intelligence/components';
import { useSelectedStoryStore, useSelectedStoryForSprint } from '@/stores/selected-story-store';
import { ApiError } from '@/lib/api-client';

// Bug 1/Bug 4: only the globally-selected story is generated for here; "View Full Story" (moved
// here from Requirement Intelligence per the user's instruction) opens as a drawer instead of
// navigating away.
export default function AiTestGeneratorPage() {
  const params = useParams<{ sprintId: string }>();
  const { data: sprint, isLoading, isError, error } = useSprint(params.sprintId);
  const selectedStoryId = useSelectedStoryForSprint(params.sprintId);
  const selectStory = useSelectedStoryStore((s) => s.selectStory);
  const [fullStoryOpen, setFullStoryOpen] = useState(false);

  useEffect(() => {
    if (!selectedStoryId && sprint?.stories[0]) {
      selectStory(params.sprintId, sprint.stories[0].id);
    }
  }, [sprint, selectedStoryId, params.sprintId, selectStory]);

  const selectedStory = sprint?.stories.find((s) => s.id === selectedStoryId) ?? sprint?.stories[0] ?? null;
  const jiraUrl =
    sprint?.jiraSiteUrl && selectedStory?.externalId
      ? `${sprint.jiraSiteUrl.replace(/\/$/, '')}/browse/${selectedStory.externalId}`
      : null;

  return (
    <div>
      <PageHeader
        title="AI Test Generator"
        description="Generate and review AI test scenarios and cases for the selected user story."
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
          <div className="flex flex-wrap items-center gap-2">
            <StoryPicker
              stories={sprint.stories}
              value={selectedStory?.id ?? null}
              onChange={(storyId) => selectStory(params.sprintId, storyId)}
            />
            <Button variant="outline" size="sm" onClick={() => setFullStoryOpen(true)} disabled={!selectedStory}>
              <FileSearch className="mr-2 h-4 w-4" />
              View Full Story
            </Button>
            {selectedStory ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/sprints/${params.sprintId}/stories/${selectedStory.id}` as never}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  BA Review
                </Link>
              </Button>
            ) : null}
          </div>
          {selectedStory ? <StoryTestGeneratorCard story={selectedStory} /> : null}
          <ViewFullStoryDrawer
            storyId={selectedStory?.id ?? null}
            open={fullStoryOpen}
            onOpenChange={setFullStoryOpen}
            jiraUrl={jiraUrl}
          />
        </div>
      )}
    </div>
  );
}
