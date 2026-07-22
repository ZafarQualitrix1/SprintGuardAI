'use client';

import { Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { useGenerateTests, useTestScenarios } from '@/features/test-intelligence/api';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import type { Story } from '@sprintguard/shared';

const priorityVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'warning',
  CRITICAL: 'destructive',
};

export function StoryTestGeneratorCard({ story }: { story: Pick<Story, 'id' | 'title'> }) {
  const { data: scenarios, isLoading } = useTestScenarios(story.id);
  const generate = useGenerateTests(story.id);

  const onGenerate = () =>
    generate.mutate(undefined, {
      onSuccess: (result) => toast({ title: 'Tests generated', description: `${result.length} scenarios generated` }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not generate tests',
          description: error instanceof ApiError ? error.message : undefined,
        }),
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{story.title}</CardTitle>
        <Button size="sm" onClick={onGenerate} disabled={generate.isPending}>
          <Wand2 className="mr-2 h-4 w-4" />
          {generate.isPending ? 'Generating…' : scenarios?.length ? 'Regenerate tests' : 'Generate tests'}
        </Button>
      </CardHeader>
      <CardContent>
        {generate.isError ? (
          <p className="mb-3 text-sm text-destructive">
            {generate.error instanceof ApiError
              ? generate.error.message
              : 'Could not generate tests for this story.'}
          </p>
        ) : null}

        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !scenarios || scenarios.length === 0 ? (
          <EmptyState
            icon={Wand2}
            title="No test scenarios yet"
            description="Requires Requirement Intelligence to have run for this story first, then generates test scenarios and cases from its acceptance criteria."
          />
        ) : (
          <div className="space-y-4">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{scenario.title}</p>
                  <Badge variant={priorityVariant[scenario.priority] ?? 'default'}>{scenario.priority}</Badge>
                </div>
                {scenario.description ? (
                  <p className="mb-2 text-xs text-muted-foreground">{scenario.description}</p>
                ) : null}
                <div className="space-y-2">
                  {scenario.testCases.map((testCase) => (
                    <div key={testCase.id} className="rounded bg-muted/50 p-2">
                      <p className="mb-1 text-xs font-medium">{testCase.title}</p>
                      <ol className="list-decimal space-y-0.5 pl-4">
                        {testCase.steps.map((step, index) => (
                          <li key={index} className="text-xs text-muted-foreground">
                            {step.step} <span className="italic">→ {step.expected}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
