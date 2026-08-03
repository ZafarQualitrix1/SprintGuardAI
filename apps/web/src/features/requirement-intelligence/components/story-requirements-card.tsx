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
import { useBaReviewStatus } from '@/features/ba-review/api';
import { BaReviewStatusBadge } from '@/features/ba-review/components';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import type { Story } from '@sprintguard/shared';
import { StoryAnalysisReport } from './story-analysis-report';

interface StoryRequirementsCardProps {
  story: Pick<Story, 'id' | 'title'>;
}

export function StoryRequirementsCard({ story }: StoryRequirementsCardProps) {
  const { data: report, isLoading } = useRequirementAnalysisReport(story.id);
  const generate = useGenerateRequirementAnalysis(story.id);
  const { data: baStatus } = useBaReviewStatus(story.id);
  // Bug 4: disabled only while a review is actually in flight at the BA in Jira. PENDING_REVIEW
  // means no cycle has ever been submitted (no Jira link, or the post to Jira failed) -- gating on
  // reviewCycleCount alone would permanently lock a non-Jira-linked story after its first generation.
  const reviewInFlight = Boolean(
    baStatus &&
      (baStatus.status === 'AWAITING_APPROVAL' ||
        baStatus.status === 'FEEDBACK_RECEIVED' ||
        baStatus.status === 'REGENERATION_IN_PROGRESS'),
  );
  const isLocked = baStatus?.isLocked ?? false;
  const disabled = generate.isPending || isLocked || reviewInFlight;
  const disabledReason = isLocked
    ? 'Test cases for this story are BA-approved and locked. An Admin must unlock it first.'
    : reviewInFlight
      ? 'A BA review is in progress for this story. Analyze is disabled until it is approved.'
      : undefined;

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
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{story.title}</CardTitle>
          {baStatus ? <BaReviewStatusBadge status={baStatus.status} reviewCycleCount={baStatus.reviewCycleCount} /> : null}
        </div>
        <Button size="sm" onClick={onAnalyze} disabled={disabled} title={disabledReason}>
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
