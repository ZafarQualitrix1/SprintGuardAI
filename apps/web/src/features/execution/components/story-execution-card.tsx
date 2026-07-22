'use client';

import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/layout/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTestScenarios } from '@/features/test-intelligence/api';
import { useRecordExecution } from '@/features/execution/api';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import type { Story } from '@sprintguard/shared';

const STATUS_OPTIONS = ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'] as const;

function TestCaseRow({ testCaseId, title, sprintId }: { testCaseId: string; title: string; sprintId: string }) {
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('PASSED');
  const record = useRecordExecution(sprintId);

  const onRecord = () => {
    record.mutate(
      { testCaseId, input: { status } },
      {
        onSuccess: () => toast({ title: 'Execution recorded', description: `${title} — ${status}` }),
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not record execution',
            description: error instanceof ApiError ? error.message : undefined,
          }),
      },
    );
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0">
      <span className="text-sm">{title}</span>
      <div className="flex shrink-0 items-center gap-2">
        <Select value={status} onValueChange={(value) => setStatus(value as (typeof STATUS_OPTIONS)[number])}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" disabled={record.isPending} onClick={onRecord}>
          Record
        </Button>
      </div>
    </div>
  );
}

export function StoryExecutionCard({ story, sprintId }: { story: Pick<Story, 'id' | 'title'>; sprintId: string }) {
  const { data: scenarios, isLoading } = useTestScenarios(story.id);
  const testCases = scenarios?.flatMap((scenario) => scenario.testCases) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{story.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : testCases.length === 0 ? (
          <EmptyState
            icon={PlayCircle}
            title="No test cases yet"
            description="Generate tests for this story before recording execution results."
          />
        ) : (
          <div>
            {testCases.map((testCase) => (
              <TestCaseRow key={testCase.id} testCaseId={testCase.id} title={testCase.title} sprintId={sprintId} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
