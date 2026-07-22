'use client';

import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { useGenerateRequirements, useRequirements } from '@/features/requirement-intelligence/api';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import type { Story } from '@sprintguard/shared';

export function StoryRequirementsCard({ story }: { story: Pick<Story, 'id' | 'title'> }) {
  const { data: requirements, isLoading } = useRequirements(story.id);
  const generate = useGenerateRequirements(story.id);

  const onAnalyze = () =>
    generate.mutate(undefined, {
      onSuccess: (result) => toast({ title: 'Story analyzed', description: `${result.length} requirements extracted` }),
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
          {generate.isPending ? 'Analyzing…' : requirements?.length ? 'Re-analyze' : 'Analyze story'}
        </Button>
      </CardHeader>
      <CardContent>
        {generate.isError ? (
          <p className="mb-3 text-sm text-destructive">
            {generate.error instanceof ApiError ? generate.error.message : 'Could not analyze this story.'}
          </p>
        ) : null}

        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !requirements || requirements.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No requirements yet"
            description="Run the Requirement Intelligence Agent to extract requirements and acceptance criteria from this story."
          />
        ) : (
          <div className="space-y-4">
            {requirements.map((requirement) => (
              <div key={requirement.id} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{requirement.text}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary">{requirement.type}</Badge>
                    {requirement.confidenceScore !== null ? (
                      <Badge variant={requirement.confidenceScore >= 0.9 ? 'success' : 'warning'}>
                        {Math.round(requirement.confidenceScore * 100)}% confidence
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <ul className="space-y-1">
                  {requirement.acceptanceCriteria.map((ac) => (
                    <li key={ac.id} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Given</span> {ac.given}{' '}
                      <span className="font-medium text-foreground">When</span> {ac.when}{' '}
                      <span className="font-medium text-foreground">Then</span> {ac.then}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
