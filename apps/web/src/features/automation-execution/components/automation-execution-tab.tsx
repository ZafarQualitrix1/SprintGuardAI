'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, FileQuestion, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyState } from '@/components/layout/empty-state';
import { useSprint } from '@/features/sprint/api';
import { StoryPicker } from '@/features/sprint/components';
import { useAutomationCandidates } from '@/features/automation/api';
import { useAutomationExecutionRuns } from '@/features/automation-execution/api';
import { ExecutionConfigDialog } from './execution-config-dialog';
import { AutomationExecutionRunCard } from './automation-execution-run-card';

type AutomationTypeChoice = 'API' | 'UI';

// Automation Execution Module (§9): the 5-step workflow --
// 1. Select Sprint: implicit, this page is already sprint-scoped via the URL.
// 2. Select User Story: StoryPicker below.
// 3. Automatically load automation generated for that User Story: useAutomationCandidates,
//    filtered to the selected story.
// 4. Choose UI Automation / API Automation: the toggle below.
// 5. Open an execution dialog: ExecutionConfigDialog.
export function AutomationExecutionTab({ sprintId }: { sprintId: string }) {
  const { data: sprint, isLoading: sprintLoading, isError: sprintError } = useSprint(sprintId);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [automationType, setAutomationType] = useState<AutomationTypeChoice>('API');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!storyId && sprint?.stories[0]) setStoryId(sprint.stories[0].id);
  }, [sprint, storyId]);

  const { data: candidates, isLoading: candidatesLoading } = useAutomationCandidates(sprintId);
  const { data: runs } = useAutomationExecutionRuns(storyId);

  const storyCandidates = (candidates ?? []).filter((c) => c.storyId === storyId);
  const runnableCount = storyCandidates.filter((c) =>
    automationType === 'API' ? c.latestApi !== null : c.latestUi !== null,
  ).length;

  if (sprintLoading) return <Skeleton className="h-64 w-full" />;
  if (sprintError || !sprint) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Couldn&apos;t load this sprint</AlertTitle>
        <AlertDescription>The sprint could not be found.</AlertDescription>
      </Alert>
    );
  }
  if (sprint.stories.length === 0) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="No stories in this sprint"
        description="Import a sprint with stories to run automation."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <StoryPicker stories={sprint.stories} value={storyId} onChange={setStoryId} className="w-full sm:w-80" />
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {(['API', 'UI'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setAutomationType(type)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                automationType === type ? 'bg-background text-foreground shadow' : 'text-muted-foreground'
              }`}
            >
              {type} Automation
            </button>
          ))}
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={runnableCount === 0}>
          <Play className="mr-1.5 h-4 w-4" />
          Run ({runnableCount})
        </Button>
      </div>

      {candidatesLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : runnableCount === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title={`No ${automationType} automation generated for this story yet`}
          description="Generate automation for this story's test cases in the Automation tab first."
        />
      ) : null}

      <div className="space-y-2">
        {(runs ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No execution runs yet for this story.</p>
        ) : (
          (runs ?? []).map((run) => <AutomationExecutionRunCard key={run.id} run={run} storyId={storyId as string} />)
        )}
      </div>

      {storyId ? (
        <ExecutionConfigDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          storyId={storyId}
          automationType={automationType}
          candidates={storyCandidates}
          onDone={() => setDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}
