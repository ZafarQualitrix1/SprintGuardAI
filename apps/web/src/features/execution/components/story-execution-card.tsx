'use client';

import { useMemo, useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/layout/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useTestScenarios } from '@/features/test-intelligence/api';
import { useExecutions } from '@/features/execution/api';
import { useStoryCoverage } from '@/features/coverage/api';
import { RecordExecutionDialog } from './record-execution-dialog';
import { ExecutionStats } from './execution-stats';
import type { Execution, TestCase } from '@sprintguard/shared';
import type { Story } from '@sprintguard/shared';

type GroupMode = 'FLAT' | 'REQUIREMENT' | 'PRIORITY';

const GROUP_OPTIONS: { value: GroupMode; label: string }[] = [
  { value: 'FLAT', label: 'All' },
  { value: 'REQUIREMENT', label: 'By Requirement' },
  { value: 'PRIORITY', label: 'By Priority' },
];

const statusVariant: Record<string, 'success' | 'destructive' | 'warning' | 'secondary' | 'outline'> = {
  PASSED: 'success',
  FAILED: 'destructive',
  BLOCKED: 'warning',
  SKIPPED: 'secondary',
  NOT_RUN: 'outline',
};

const priorityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function TestCaseRow({
  testCase,
  latestExecution,
  onRecord,
}: {
  testCase: Pick<TestCase, 'id' | 'title' | 'priority'>;
  latestExecution: Execution | undefined;
  onRecord: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0">
      <span className="truncate text-sm">{testCase.title}</span>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={statusVariant[latestExecution?.status ?? 'NOT_RUN'] ?? 'outline'}>
          {latestExecution?.status ?? 'NOT_RUN'}
        </Badge>
        <Button size="sm" variant="outline" onClick={onRecord}>
          Record
        </Button>
      </div>
    </div>
  );
}

export function StoryExecutionCard({ story, sprintId }: { story: Pick<Story, 'id' | 'title'>; sprintId: string }) {
  const { data: scenarios, isLoading } = useTestScenarios(story.id);
  const { data: allExecutions } = useExecutions(sprintId);
  const [groupBy, setGroupBy] = useState<GroupMode>('FLAT');
  const { data: coverage, isLoading: coverageLoading } = useStoryCoverage(groupBy === 'REQUIREMENT' ? story.id : null);
  const [recordingTestCase, setRecordingTestCase] = useState<{ id: string; title: string } | null>(null);

  const testCases = scenarios?.flatMap((scenario) => scenario.testCases) ?? [];

  // Latest execution per test case -- useExecutions already returns sprint-wide rows ordered
  // executedAt desc (see PrismaExecutionRepository.findBySprintId), so the first hit per id wins.
  const latestByTestCaseId = useMemo(() => {
    const map = new Map<string, Execution>();
    for (const execution of allExecutions ?? []) {
      if (!map.has(execution.testCaseId)) map.set(execution.testCaseId, execution);
    }
    return map;
  }, [allExecutions]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{story.title}</CardTitle>
        <div className="flex items-center gap-1">
          {GROUP_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={groupBy === option.value ? 'default' : 'outline'}
              onClick={() => setGroupBy(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {testCases.length > 0 ? (
          <ExecutionStats testCaseIds={testCases.map((tc) => tc.id)} latestExecutionByTestCaseId={latestByTestCaseId} />
        ) : null}

        {isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : testCases.length === 0 ? (
          <EmptyState
            icon={PlayCircle}
            title="No test cases yet"
            description="Generate tests for this story before recording execution results."
          />
        ) : groupBy === 'FLAT' ? (
          <div>
            {testCases.map((testCase) => (
              <TestCaseRow
                key={testCase.id}
                testCase={testCase}
                latestExecution={latestByTestCaseId.get(testCase.id)}
                onRecord={() => setRecordingTestCase({ id: testCase.id, title: testCase.title })}
              />
            ))}
          </div>
        ) : groupBy === 'PRIORITY' ? (
          <div className="space-y-4">
            {priorityOrder
              .map((priority) => ({ priority, cases: testCases.filter((tc) => tc.priority === priority) }))
              .filter((group) => group.cases.length > 0)
              .map((group) => (
                <div key={group.priority}>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{group.priority}</p>
                  {group.cases.map((testCase) => (
                    <TestCaseRow
                      key={testCase.id}
                      testCase={testCase}
                      latestExecution={latestByTestCaseId.get(testCase.id)}
                      onRecord={() => setRecordingTestCase({ id: testCase.id, title: testCase.title })}
                    />
                  ))}
                </div>
              ))}
          </div>
        ) : coverageLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <div className="space-y-4">
            {(coverage?.traceabilityMatrix ?? []).map((requirement) => {
              const requirementTestCases = new Map<string, { id: string; title: string; priority: string }>();
              for (const ac of requirement.acceptanceCriteria) {
                for (const tc of ac.testCases) {
                  const fullTestCase = testCases.find((t) => t.id === tc.id);
                  requirementTestCases.set(tc.id, { id: tc.id, title: tc.title, priority: fullTestCase?.priority ?? 'MEDIUM' });
                }
              }
              const list = Array.from(requirementTestCases.values());
              if (list.length === 0) return null;
              return (
                <div key={requirement.requirementId}>
                  <p className="mb-1 truncate text-xs font-medium text-muted-foreground">{requirement.requirementText}</p>
                  {list.map((testCase) => (
                    <TestCaseRow
                      key={testCase.id}
                      testCase={testCase}
                      latestExecution={latestByTestCaseId.get(testCase.id)}
                      onRecord={() => setRecordingTestCase({ id: testCase.id, title: testCase.title })}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <RecordExecutionDialog
        testCaseId={recordingTestCase?.id ?? null}
        testCaseTitle={recordingTestCase?.title ?? ''}
        sprintId={sprintId}
        onOpenChange={(open) => !open && setRecordingTestCase(null)}
      />
    </Card>
  );
}
