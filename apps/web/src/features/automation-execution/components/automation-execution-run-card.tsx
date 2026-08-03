'use client';

import { Ban, CheckCircle2, Clock, Download, ExternalLink, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCancelAutomationExecution } from '@/features/automation-execution/api';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import type { AutomationExecutionRun } from '@sprintguard/shared';

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'outline'> = {
  QUEUED: 'outline',
  RUNNING: 'default',
  PASSED: 'success',
  FAILED: 'destructive',
  ERROR: 'destructive',
  CANCELLED: 'secondary',
};

function downloadJson(run: AutomationExecutionRun) {
  const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `automation-execution-${run.id}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Automation Reports (§11): "Keep the Download Report button disabled until execution is
// complete." JSON Report is always generatable client-side from the run's own response; the HTML
// report lives as a GitHub Actions artifact on the run page (reportArtifactUrl) -- see
// automation-execution.yml's upload-artifact step. Spark/Extent/Excel report *formats* are not
// generated in this pass (would need additional Playwright reporter plugins wired into the
// workflow, unverifiable without a live GitHub Actions token in this environment).
export function AutomationExecutionRunCard({ run, storyId }: { run: AutomationExecutionRun; storyId: string }) {
  const cancel = useCancelAutomationExecution(storyId);
  const isActive = run.status === 'QUEUED' || run.status === 'RUNNING';
  const isTerminal = !isActive;

  const onCancel = () =>
    cancel.mutate(run.id, {
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not cancel',
          description: error instanceof ApiError ? error.message : undefined,
        }),
    });

  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant[run.status] ?? 'outline'}>{run.status}</Badge>
          <span className="text-sm font-medium">
            {run.automationType} · {run.environment}
            {run.browser ? ` · ${run.browser}` : ''}
          </span>
          {isActive ? <Clock className="h-3.5 w-3.5 animate-pulse text-muted-foreground" /> : null}
        </div>
        <div className="flex items-center gap-2">
          {run.githubRunUrl ? (
            <a href={run.githubRunUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
              View run <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
          {isActive ? (
            <Button size="sm" variant="outline" onClick={onCancel} disabled={cancel.isPending}>
              <Ban className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
          ) : null}
          <Button size="sm" variant="outline" disabled={!isTerminal} onClick={() => downloadJson(run)}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download Report
          </Button>
        </div>
      </div>

      {run.totalTests !== null ? (
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> {run.passedTests ?? 0} passed
          </span>
          <span className="flex items-center gap-1 text-destructive">
            <XCircle className="h-3.5 w-3.5" /> {run.failedTests ?? 0} failed
          </span>
          <span>{run.skippedTests ?? 0} skipped</span>
          <span>{run.totalTests} total</span>
        </div>
      ) : null}

      {run.errorMessage ? <p className="mt-2 text-xs text-destructive">{run.errorMessage}</p> : null}

      {run.testResults.length > 0 ? (
        <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded bg-muted/30 p-2">
          {run.testResults.map((result, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <span className="truncate">{result.title}</span>
              <span className={result.status === 'PASSED' ? 'text-emerald-600 dark:text-emerald-400' : result.status === 'FAILED' ? 'text-destructive' : 'text-muted-foreground'}>
                {result.status} · {result.durationMs}ms
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
