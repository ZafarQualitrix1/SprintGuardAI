'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { automationExecutionApi } from '@/features/automation-execution/api';
import type { AutomationExecutionRun } from '@sprintguard/shared';

export interface RunnableAutomationItem {
  testCaseId: string;
  storyId: string;
  generationId: string;
  label: string;
}

export interface TriggeredAutomationRun {
  testCaseId: string;
  label: string;
  run: AutomationExecutionRun;
}

interface RunAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: RunnableAutomationItem[];
  onTriggered: (runs: TriggeredAutomationRun[]) => void;
}

// Generalized version of automation-execution/components/execution-config-dialog.tsx -- that one
// assumes every candidate belongs to the one story its containing tab is already scoped to. API
// Automation's selection can span multiple stories/sprints at once, so this takes each item's own
// storyId and calls the trigger endpoint directly per item instead of one story-fixed mutation hook.
export function RunAutomationDialog({ open, onOpenChange, items, onTriggered }: RunAutomationDialogProps) {
  const [environment, setEnvironment] = useState('staging');
  const [tags, setTags] = useState('');
  const [parallelWorkers, setParallelWorkers] = useState('1');
  const [isRunning, setIsRunning] = useState(false);

  const onRun = async () => {
    setIsRunning(true);
    const triggered: TriggeredAutomationRun[] = [];
    let failed = 0;
    // Sequential, same rationale as every other bulk action in this module.
    for (const item of items) {
      try {
        const run = await automationExecutionApi.run(item.storyId, {
          automationGenerationId: item.generationId,
          environment,
          tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
          parallelWorkers: Number(parallelWorkers) || 1,
        });
        triggered.push({ testCaseId: item.testCaseId, label: item.label, run });
      } catch (error) {
        failed++;
        toast({
          variant: 'destructive',
          title: `Could not start execution for ${item.label}`,
          description: error instanceof ApiError ? error.message : undefined,
        });
      }
    }
    setIsRunning(false);
    onOpenChange(false);
    if (triggered.length > 0) {
      onTriggered(triggered);
      toast({
        title: 'Execution dispatched',
        description: `${triggered.length} run(s) started${failed ? `, ${failed} failed to start` : ''}`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run automation</DialogTitle>
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
              <p className="font-medium">{items.length}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="run-environment">Environment</Label>
            <Input id="run-environment" value={environment} onChange={(e) => setEnvironment(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="run-tags">Tags (comma-separated)</Label>
              <Input id="run-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="smoke, regression" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="run-workers">Parallel workers</Label>
              <Input
                id="run-workers"
                type="number"
                min={1}
                max={8}
                value={parallelWorkers}
                onChange={(e) => setParallelWorkers(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRunning}>
            Cancel
          </Button>
          <Button onClick={onRun} disabled={isRunning || items.length === 0}>
            {isRunning ? 'Starting…' : 'Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
