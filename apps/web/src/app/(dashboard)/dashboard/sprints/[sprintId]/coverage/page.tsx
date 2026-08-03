'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, FileQuestion, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSprint } from '@/features/sprint/api';
import { StoryPicker } from '@/features/sprint/components';
import { useComputeStoryCoverage, useStoryCoverage } from '@/features/coverage/api';
import { CoverageDimensionsGrid } from '@/features/coverage/components';
import { useSelectedStoryStore, useSelectedStoryForSprint } from '@/stores/selected-story-store';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

// Bug 1/Bug 3: coverage is computed from the selected user story's real requirement/test-case data
// only, refetches automatically whenever Requirement Analysis or Test Generation changes (see the
// invalidation added to useGenerateRequirementAnalysis/useGenerateTests), and shows only the
// metrics actually asked for -- no traceability matrix, no raw gap dump, no redundant count cards.
export default function CoveragePage() {
  const params = useParams<{ sprintId: string }>();
  const { data: sprint, isLoading: sprintLoading, isError: sprintError } = useSprint(params.sprintId);
  const selectedStoryId = useSelectedStoryForSprint(params.sprintId);
  const selectStory = useSelectedStoryStore((s) => s.selectStory);

  useEffect(() => {
    if (!selectedStoryId && sprint?.stories[0]) {
      selectStory(params.sprintId, sprint.stories[0].id);
    }
  }, [sprint, selectedStoryId, params.sprintId, selectStory]);

  const storyId = sprint?.stories.find((s) => s.id === selectedStoryId)?.id ?? sprint?.stories[0]?.id ?? null;
  const { data: coverage, isLoading: coverageLoading } = useStoryCoverage(storyId);
  const compute = useComputeStoryCoverage(storyId);

  return (
    <div>
      <PageHeader
        title="Test Coverage"
        description="Real-time coverage for the selected user story, computed from its requirements and generated test cases."
        actions={
          <Button
            onClick={() =>
              compute.mutate(undefined, {
                onSuccess: (result) =>
                  toast({
                    title: 'Coverage computed',
                    description: `${result.summary.coveragePercent}% covered (${result.summary.coveredCount}/${result.summary.totalRequirements} requirements)`,
                  }),
                onError: (error) =>
                  toast({
                    variant: 'destructive',
                    title: 'Could not compute coverage',
                    description: error instanceof ApiError ? error.message : undefined,
                  }),
              })
            }
            disabled={compute.isPending || !storyId}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {compute.isPending ? 'Computing…' : 'Compute coverage'}
          </Button>
        }
      />

      {sprintLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : sprintError || !sprint ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t load this sprint</AlertTitle>
          <AlertDescription>The sprint could not be found.</AlertDescription>
        </Alert>
      ) : sprint.stories.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No stories in this sprint"
          description="Import a sprint with stories to analyze coverage."
        />
      ) : (
        <div className="space-y-4">
          <StoryPicker
            stories={sprint.stories}
            value={storyId}
            onChange={(id) => selectStory(params.sprintId, id)}
          />

          {compute.isError ? (
            <p className="text-sm text-destructive">
              {compute.error instanceof ApiError ? compute.error.message : 'Could not compute coverage.'}
            </p>
          ) : null}

          {coverageLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !coverage ? null : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Overall Coverage Percentage</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{coverage.summary.coveragePercent}%</p>
                  <p className="text-xs text-muted-foreground">
                    {coverage.summary.coveredCount} of {coverage.summary.totalRequirements} requirements fully covered
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Coverage dimensions</CardTitle>
                </CardHeader>
                <CardContent>
                  <CoverageDimensionsGrid dimensions={coverage.dimensions} />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Missing test scenarios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {coverage.missingTestScenarios.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None — every acceptance criterion has a test.</p>
                    ) : (
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {coverage.missingTestScenarios.map((line, index) => (
                          <li key={index}>• {line}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Missing acceptance criteria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {coverage.missingAcceptanceCriteria.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None — every requirement has acceptance criteria.</p>
                    ) : (
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {coverage.missingAcceptanceCriteria.map((line, index) => (
                          <li key={index}>• {line}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  {!coverage.aiRecommendation ? (
                    <p className="text-sm text-muted-foreground">
                      AI suggestions appear here right after you click &ldquo;Compute coverage&rdquo; — they
                      aren&apos;t saved, so reloading this page clears them.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm">
                        Quality score:{' '}
                        <span className="font-semibold">{coverage.aiRecommendation.qualityScore}/100</span>
                      </p>
                      <p className="whitespace-pre-line text-sm text-muted-foreground">
                        {coverage.aiRecommendation.summary}
                      </p>
                      {coverage.aiRecommendation.missingScenarios.length > 0 ? (
                        <div className="space-y-2">
                          {coverage.aiRecommendation.missingScenarios.map((scenario, index) => (
                            <div key={index} className="rounded-md border p-2">
                              <p className="text-sm font-medium">{scenario.suggestedScenario}</p>
                              <p className="text-xs text-muted-foreground">For: {scenario.requirementText}</p>
                              <p className="text-xs text-muted-foreground">{scenario.reason}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
