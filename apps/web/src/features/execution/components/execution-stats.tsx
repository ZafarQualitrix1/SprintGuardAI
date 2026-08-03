'use client';

import { Progress } from '@/components/ui/progress';
import type { Execution } from '@sprintguard/shared';

interface ExecutionStatsProps {
  testCaseIds: string[];
  latestExecutionByTestCaseId: Map<string, Execution>;
}

// Manual Execution Module (§8): "Automatically calculate Pass % / Fail % / Blocked % / Execution
// Progress" -- derived client-side from the already-fetched test case list + sprint-wide
// executions (latest execution per test case wins), no dedicated backend aggregate needed.
export function ExecutionStats({ testCaseIds, latestExecutionByTestCaseId }: ExecutionStatsProps) {
  const total = testCaseIds.length;
  let passed = 0;
  let failed = 0;
  let blocked = 0;
  let skipped = 0;
  let notRun = 0;

  for (const id of testCaseIds) {
    const status = latestExecutionByTestCaseId.get(id)?.status ?? 'NOT_RUN';
    if (status === 'PASSED') passed++;
    else if (status === 'FAILED') failed++;
    else if (status === 'BLOCKED') blocked++;
    else if (status === 'SKIPPED') skipped++;
    else notRun++;
  }

  const executed = total - notRun;
  const progress = total === 0 ? 0 : Math.round((executed / total) * 100);
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  if (total === 0) return null;

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">Execution progress</span>
        <span className="font-medium">{progress}% ({executed}/{total})</span>
      </div>
      <Progress value={progress} />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Pass {pct(passed)}%</span>
        <span>Fail {pct(failed)}%</span>
        <span>Blocked {pct(blocked)}%</span>
        <span>Skipped {pct(skipped)}%</span>
        <span>Not executed {pct(notRun)}%</span>
      </div>
    </div>
  );
}
