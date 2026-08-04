'use client';

import { useState } from 'react';
import { ChevronDown, Download, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  testIntelligenceApi,
  useGenerateTestCases,
  useGenerateTestScenarios,
  useTestScenarios,
} from '@/features/test-intelligence/api';
import { exportTestCasesToPdf } from '@/features/test-intelligence/lib/export-pdf';
import { useBaReviewStatus } from '@/features/ba-review/api';
import { BaReviewStatusBadge } from '@/features/ba-review/components';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { downloadBlob } from '@/lib/download';
import type { Story, TestCase } from '@sprintguard/shared';

const priorityVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'warning',
  CRITICAL: 'destructive',
};

interface StoryTestGeneratorCardProps {
  story: Pick<Story, 'id' | 'title' | 'externalId'>;
}

// Enterprise Test Generation fields don't fit inline without overwhelming an already-dense card --
// collapsed by default, one toggle per test case.
function TestCaseDetails({ testCase }: { testCase: TestCase }) {
  const [open, setOpen] = useState(false);
  const hasDetails =
    testCase.testObjective ||
    (testCase.preconditions && testCase.preconditions.length > 0) ||
    testCase.dependencies ||
    testCase.requestMethod ||
    testCase.expectedStatusCode !== null ||
    testCase.expectedResponse ||
    testCase.remarks;
  if (!hasDetails) return null;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        {testCase.displayId ? `${testCase.displayId} · Details` : 'Details'}
      </button>
      {open ? (
        <dl className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 rounded bg-background/50 p-2 text-xs sm:grid-cols-2">
          {testCase.testObjective ? (
            <div className="sm:col-span-2">
              <dt className="font-medium text-muted-foreground">Objective</dt>
              <dd>{testCase.testObjective}</dd>
            </div>
          ) : null}
          {testCase.preconditions && testCase.preconditions.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="font-medium text-muted-foreground">Preconditions</dt>
              <dd>{testCase.preconditions.join(', ')}</dd>
            </div>
          ) : null}
          {testCase.dependencies ? (
            <div className="sm:col-span-2">
              <dt className="font-medium text-muted-foreground">Dependencies</dt>
              <dd>{testCase.dependencies}</dd>
            </div>
          ) : null}
          {testCase.requestMethod ? (
            <div>
              <dt className="font-medium text-muted-foreground">Request</dt>
              <dd>{testCase.requestMethod}</dd>
            </div>
          ) : null}
          {testCase.expectedStatusCode !== null ? (
            <div>
              <dt className="font-medium text-muted-foreground">Expected Status</dt>
              <dd>{testCase.expectedStatusCode}</dd>
            </div>
          ) : null}
          {testCase.expectedResponse ? (
            <div className="sm:col-span-2">
              <dt className="font-medium text-muted-foreground">Expected Response</dt>
              <dd>{testCase.expectedResponse}</dd>
            </div>
          ) : null}
          {testCase.remarks ? (
            <div className="sm:col-span-2">
              <dt className="font-medium text-muted-foreground">Remarks</dt>
              <dd>{testCase.remarks}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

export function StoryTestGeneratorCard({ story }: StoryTestGeneratorCardProps) {
  const { data: scenarios, isLoading } = useTestScenarios(story.id);
  const generateScenarios = useGenerateTestScenarios(story.id);
  const generateCases = useGenerateTestCases(story.id);
  const [isExporting, setIsExporting] = useState(false);
  const { data: baStatus } = useBaReviewStatus(story.id);
  // Bug 4: disabled only while a review is actually in flight at the BA in Jira -- see
  // story-requirements-card.tsx for the identical rationale.
  const reviewInFlight = Boolean(
    baStatus &&
      (baStatus.status === 'AWAITING_APPROVAL' ||
        baStatus.status === 'FEEDBACK_RECEIVED' ||
        baStatus.status === 'REGENERATION_IN_PROGRESS'),
  );
  const isLocked = baStatus?.isLocked ?? false;
  const lockedOrInFlight = isLocked || reviewInFlight;
  const lockedOrInFlightReason = isLocked
    ? 'Test cases for this story are BA-approved and locked. An Admin must unlock it first.'
    : reviewInFlight
      ? 'A BA review is in progress for this story. Generate is disabled until it is approved.'
      : undefined;

  const hasScenarios = Boolean(scenarios?.length);
  const hasCases = Boolean(scenarios?.some((s) => s.testCases.length > 0));
  const scenariosDisabled = generateScenarios.isPending || lockedOrInFlight;
  const casesDisabled = generateCases.isPending || lockedOrInFlight || !hasScenarios;
  const casesDisabledReason = !hasScenarios ? 'Generate test scenarios first.' : lockedOrInFlightReason;

  const onGenerateScenarios = () =>
    generateScenarios.mutate(undefined, {
      onSuccess: (result) =>
        toast({ title: 'Test scenarios generated', description: `${result.length} scenarios generated` }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not generate test scenarios',
          description: error instanceof ApiError ? error.message : undefined,
        }),
    });

  const onGenerateCases = () =>
    generateCases.mutate(undefined, {
      onSuccess: (result) => {
        const caseCount = result.reduce((sum, scenario) => sum + scenario.testCases.length, 0);
        toast({ title: 'Test cases generated', description: `${caseCount} test cases generated` });
      },
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not generate test cases',
          description: error instanceof ApiError ? error.message : undefined,
        }),
    });

  const onExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
    if (!scenarios) return;
    setIsExporting(true);
    try {
      if (format === 'pdf') {
        exportTestCasesToPdf(story.title, story.externalId, scenarios);
      } else {
        const blob = await testIntelligenceApi.exportTests(story.id, format);
        downloadBlob(blob, `${story.externalId ?? story.id}-test-cases.${format}`);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not export test cases',
        description: error instanceof ApiError ? error.message : undefined,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{story.title}</CardTitle>
          {baStatus ? <BaReviewStatusBadge status={baStatus.status} reviewCycleCount={baStatus.reviewCycleCount} /> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onGenerateScenarios}
            disabled={scenariosDisabled}
            title={lockedOrInFlightReason}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            {generateScenarios.isPending ? 'Generating…' : hasScenarios ? 'Regenerate Test Scenarios' : 'Generate Test Scenarios'}
          </Button>
          <Button size="sm" onClick={onGenerateCases} disabled={casesDisabled} title={casesDisabledReason}>
            <Wand2 className="mr-2 h-4 w-4" />
            {generateCases.isPending
              ? 'Generating…'
              : scenarios?.some((s) => s.testCases.length > 0)
                ? 'Regenerate Test Cases'
                : 'Generate Test Cases'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" disabled={!hasCases || isExporting} title="Export test cases">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onExport('xlsx')}>Export Excel</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onExport('csv')}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onExport('pdf')}>Export PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {generateScenarios.isError ? (
          <p className="mb-3 text-sm text-destructive">
            {generateScenarios.error instanceof ApiError
              ? generateScenarios.error.message
              : 'Could not generate test scenarios for this story.'}
          </p>
        ) : null}
        {generateCases.isError ? (
          <p className="mb-3 text-sm text-destructive">
            {generateCases.error instanceof ApiError
              ? generateCases.error.message
              : 'Could not generate test cases for this story.'}
          </p>
        ) : null}

        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !scenarios || scenarios.length === 0 ? (
          <EmptyState
            icon={Wand2}
            title="No test scenarios yet"
            description="Click Generate Test Scenarios to derive high-level scenarios from this story's acceptance criteria, then Generate Test Cases to expand them into executable steps."
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
                      <TestCaseDetails testCase={testCase} />
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
