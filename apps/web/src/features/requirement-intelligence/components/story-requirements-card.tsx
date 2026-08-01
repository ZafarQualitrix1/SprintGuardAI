'use client';

import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import {
  useGenerateRequirementAnalysis,
  useRequirementAnalysisReport,
} from '@/features/requirement-intelligence/api';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import type { Story } from '@sprintguard/shared';
import { StoryAnalysisReport } from './story-analysis-report';

export function StoryRequirementsCard({ story }: { story: Pick<Story, 'id' | 'title'> }) {
  const { data: report, isLoading } = useRequirementAnalysisReport(story.id);
  const generate = useGenerateRequirementAnalysis(story.id);

  // A single backend call drives both the rich analysis shown here and (fire-and-forget, server
  // side) the lightweight Requirement/AcceptanceCriterion extraction the Coverage tab reads from
  // -- clicking Analyze here never touches any other story.
  const onAnalyze = () =>
    generate.mutate(undefined, {
      onSuccess: () => toast({ title: 'Story analyzed', description: `${story.title} — deep analysis ready` }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not analyze this story',
          description: error instanceof ApiError ? error.message : undefined,
        }),
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{story.title}</CardTitle>
        <Button size="sm" onClick={onAnalyze} disabled={generate.isPending}>
          <Sparkles className="mr-2 h-4 w-4" />
          {generate.isPending ? 'Analyzing…' : report ? 'Re-analyze' : 'Analyze story'}
        </Button>
      </CardHeader>
      <CardContent>
        {generate.isError ? (
          <p className="mb-3 text-sm text-destructive">
            {generate.error instanceof ApiError ? generate.error.message : 'Could not analyze this story.'}
          </p>
        ) : null}

        {isLoading || generate.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : !report ? (
          <EmptyState
            icon={Sparkles}
            title="No requirements yet"
            description="Run the Requirement Intelligence Agent to extract requirements and acceptance criteria from this story."
          />
        ) : (
          <StoryAnalysisReport storyId={story.id} storyTitle={story.title} report={report} />
        )}
      </CardContent>
    </Card>
  );
}
