'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAutomationExecutionRun } from '@/features/automation-execution/api';
import { ExecutionReportDownloads } from '@/features/automation-execution/components';
import type { AutomationExecutionRun } from '@sprintguard/shared';

const STEPS = ['Preparing…', 'Installing dependencies…', 'Loading environment…', 'Executing tests…', 'Generating report…'];

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'warning'> = {
  QUEUED: 'secondary',
  RUNNING: 'default',
  PASSED: 'success',
  FAILED: 'destructive',
  ERROR: 'destructive',
  CANCELLED: 'warning',
};

const TERMINAL_STATUSES = new Set(['PASSED', 'FAILED', 'ERROR', 'CANCELLED']);

function RunProgressCard({
  testCaseId,
  label,
  runId,
  onRunUpdate,
}: {
  testCaseId: string;
  label: string;
  runId: string;
  onRunUpdate?: (testCaseId: string, run: AutomationExecutionRun) => void;
}) {
  const { data: run } = useAutomationExecutionRun(runId);
  const [stepIndex, setStepIndex] = useState(0);

  const isTerminal = run ? TERMINAL_STATUSES.has(run.status) : false;

  // The execution backend (GitHub Actions dispatch, polled every 4s) only ever reports QUEUED ->
  // RUNNING -> a terminal status, not granular per-step progress -- this cycles through the spec's
  // requested step list on a timer while RUNNING so the panel doesn't just sit on one static label
  // for however long the run takes, without claiming knowledge the backend doesn't actually have.
  useEffect(() => {
    if (!run || run.status !== 'RUNNING') return;
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [run]);

  // Surfaces this card's own live-polled status back up to the page, so the candidate grid's
  // Execution Status column doesn't stay frozen at whatever status it had when the run was
  // triggered -- this is the one place actually polling, the grid just mirrors it.
  useEffect(() => {
    if (run) onRunUpdate?.(testCaseId, run);
  }, [run, testCaseId, onRunUpdate]);

  if (!run) {
    return null;
  }

  const percent = isTerminal ? 100 : run.status === 'QUEUED' ? 8 : Math.round(((stepIndex + 1) / STEPS.length) * 90);
  const stepLabel = isTerminal ? 'Completed' : run.status === 'QUEUED' ? STEPS[0] : STEPS[Math.max(1, stepIndex)];

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{label}</span>
        <Badge variant={STATUS_VARIANT[run.status] ?? 'secondary'}>{run.status}</Badge>
      </div>
      <Progress value={percent} className={isTerminal && run.status !== 'PASSED' ? '[&>div]:bg-destructive' : undefined} />
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        {isTerminal ? (
          run.status === 'PASSED' ? (
            <CheckCircle2 className="h-3 w-3 text-success" />
          ) : (
            <XCircle className="h-3 w-3 text-destructive" />
          )
        ) : (
          <Loader2 className="h-3 w-3 animate-spin" />
        )}
        <span>{stepLabel}</span>
        {isTerminal && run.totalTests !== null ? (
          <span>
            · {run.passedTests ?? 0} passed, {run.failedTests ?? 0} failed
            {run.skippedTests ? `, ${run.skippedTests} skipped` : ''}
          </span>
        ) : null}
        {run.githubRunUrl ? (
          <a href={run.githubRunUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            View run →
          </a>
        ) : null}
        {isTerminal ? (
          <div className="ml-auto">
            <ExecutionReportDownloads run={run} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export interface TrackedExecutionRun {
  testCaseId: string;
  label: string;
  runId: string;
}

interface ExecutionProgressPanelProps {
  runs: TrackedExecutionRun[];
  onRunUpdate?: (testCaseId: string, run: AutomationExecutionRun) => void;
}

export function ExecutionProgressPanel({ runs, onRunUpdate }: ExecutionProgressPanelProps) {
  if (runs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Execution progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {runs.map((r) => (
          <RunProgressCard key={r.runId} testCaseId={r.testCaseId} label={r.label} runId={r.runId} onRunUpdate={onRunUpdate} />
        ))}
      </CardContent>
    </Card>
  );
}
