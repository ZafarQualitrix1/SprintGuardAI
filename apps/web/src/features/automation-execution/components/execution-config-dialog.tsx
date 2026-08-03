'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTriggerAutomationExecution } from '@/features/automation-execution/api';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import type { AutomationCandidate } from '@sprintguard/shared';

interface ExecutionConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  automationType: 'API' | 'UI';
  candidates: AutomationCandidate[]; // each with a latestApi/latestUi generation to run
  onDone: () => void;
}

// Step 5 of the workflow (§9): "Open an execution dialog" -- Framework/Number of Test Cases/
// Environment/Browser/Tags/Parallel Workers, with Run/Cancel. There is no single "batch run" on
// the backend (one AutomationExecutionRun == one AutomationGeneration/test case), so Run dispatches
// one run per selected test case sequentially and the resulting runs are tracked together in the
// run list below this dialog.
export function ExecutionConfigDialog({ open, onOpenChange, storyId, automationType, candidates, onDone }: ExecutionConfigDialogProps) {
  const [environment, setEnvironment] = useState('staging');
  const [browser, setBrowser] = useState<'chromium' | 'firefox' | 'webkit'>('chromium');
  const [tags, setTags] = useState('');
  const [parallelWorkers, setParallelWorkers] = useState('1');
  const [isRunning, setIsRunning] = useState(false);

  const trigger = useTriggerAutomationExecution(storyId);

  const runnable = candidates.filter((c) =>
    automationType === 'API' ? c.latestApi !== null : c.latestUi !== null,
  );

  const onRun = async () => {
    setIsRunning(true);
    let succeeded = 0;
    let failed = 0;
    for (const candidate of runnable) {
      const generation = automationType === 'API' ? candidate.latestApi : candidate.latestUi;
      if (!generation) continue;
      try {
        await trigger.mutateAsync({
          automationGenerationId: generation.id,
          environment,
          browser: automationType === 'UI' ? browser : undefined,
          tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
          parallelWorkers: Number(parallelWorkers) || 1,
        });
        succeeded++;
      } catch {
        failed++;
      }
    }
    setIsRunning(false);
    toast({
      title: 'Execution dispatched',
      description: `${succeeded} run(s) started${failed ? `, ${failed} failed to start` : ''}`,
      variant: failed > 0 && succeeded === 0 ? 'destructive' : 'default',
    });
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run {automationType} automation</DialogTitle>
          <DialogDescription>Configure the environment before running.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
            <div>
              <p className="text-muted-foreground">Framework</p>
              <p className="font-medium">Playwright</p>
            </div>
            <div>
              <p className="text-muted-foreground">Test cases</p>
              <p className="font-medium">{runnable.length}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="environment">Environment</Label>
            <Input id="environment" value={environment} onChange={(e) => setEnvironment(e.target.value)} />
          </div>

          {automationType === 'UI' ? (
            <div className="space-y-2">
              <Label>Browser</Label>
              <Select value={browser} onValueChange={(value) => setBrowser(value as typeof browser)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chromium">Chromium</SelectItem>
                  <SelectItem value="firefox">Firefox</SelectItem>
                  <SelectItem value="webkit">WebKit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="smoke, regression" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workers">Parallel workers</Label>
              <Input id="workers" type="number" min={1} max={8} value={parallelWorkers} onChange={(e) => setParallelWorkers(e.target.value)} />
            </div>
          </div>

          {trigger.isError ? (
            <p className="text-sm text-destructive">
              {trigger.error instanceof ApiError ? trigger.error.message : 'Could not start execution.'}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRunning}>
            Cancel
          </Button>
          <Button onClick={onRun} disabled={isRunning || runnable.length === 0}>
            {isRunning ? 'Starting…' : 'Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
