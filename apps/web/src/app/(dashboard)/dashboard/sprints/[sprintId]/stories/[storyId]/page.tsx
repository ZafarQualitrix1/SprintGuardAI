'use client';

import { useParams } from 'next/navigation';
import { AlertCircle, FileQuestion } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useSprint } from '@/features/sprint/api';
import { StoryRequirementsCard } from '@/features/requirement-intelligence/components/story-requirements-card';
import { StoryTestGeneratorCard } from '@/features/test-intelligence/components/story-test-generator-card';
import { useBaReviewStatus } from '@/features/ba-review/api';
import { BaReviewStatusPanel, LockBadge, ReviewTimeline } from '@/features/ba-review/components';

// The real per-story detail page -- previously a "Coming soon" stub. Brings together the existing
// Requirements/Test Generator cards with the BA Review Workflow's governance panels (Status,
// Timeline, Lock badge) that don't fit cleanly on the scattered per-sprint list pages anymore.
export default function StoryDetailPage() {
  const params = useParams<{ sprintId: string; storyId: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: sprint, isLoading, isError, error } = useSprint(params.sprintId);
  const { data: baStatus } = useBaReviewStatus(params.storyId);

  const story = sprint?.stories.find((s) => s.id === params.storyId);
  const canApprove = user?.permissions.includes('test:approve') ?? false;
  const canAdminUnlock = user?.permissions.includes('test:admin-unlock') ?? false;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Story" description="Loading…" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !sprint) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Couldn&apos;t load this sprint</AlertTitle>
        <AlertDescription>{error instanceof ApiError ? error.message : 'The sprint could not be found.'}</AlertDescription>
      </Alert>
    );
  }

  if (!story) {
    return (
      <EmptyState icon={FileQuestion} title="Story not found" description="This story doesn't exist in this sprint." />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={story.title} description={`${sprint.name} · ${story.externalId ?? story.id}`} />

      {baStatus ? <LockBadge status={baStatus} /> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <StoryRequirementsCard story={story} />
          <StoryTestGeneratorCard story={story} />
        </div>
        <div className="space-y-4">
          <BaReviewStatusPanel storyId={story.id} canApprove={canApprove} canAdminUnlock={canAdminUnlock} />
          <ReviewTimeline storyId={story.id} />
        </div>
      </div>
    </div>
  );
}
