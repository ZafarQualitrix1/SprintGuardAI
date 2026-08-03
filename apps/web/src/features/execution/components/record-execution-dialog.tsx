'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRecordExecution } from '@/features/execution/api';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';

const STATUS_OPTIONS = ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'] as const;

function parseUrlList(value: string): string[] {
  return value
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
}

interface RecordExecutionDialogProps {
  testCaseId: string | null;
  testCaseTitle: string;
  sprintId: string;
  onOpenChange: (open: boolean) => void;
}

// Manual Execution Module (§8): rich capture -- status, actual result, notes, tester name (pre-
// filled from the logged-in user, editable), attachments/screenshots (URL lists), defect
// reference, and execution time -- everything the spec's "Capture" list asks for beyond the bare
// status the old inline Select+Button afforded.
export function RecordExecutionDialog({ testCaseId, testCaseTitle, sprintId, onOpenChange }: RecordExecutionDialogProps) {
  const currentUser = useAuthStore((state) => state.user);
  const record = useRecordExecution(sprintId);

  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('PASSED');
  const [actualResult, setActualResult] = useState('');
  const [notes, setNotes] = useState('');
  const [testerName, setTesterName] = useState(currentUser?.fullName ?? '');
  const [attachments, setAttachments] = useState('');
  const [screenshots, setScreenshots] = useState('');
  const [defectReference, setDefectReference] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');

  const reset = () => {
    setStatus('PASSED');
    setActualResult('');
    setNotes('');
    setAttachments('');
    setScreenshots('');
    setDefectReference('');
    setDurationMinutes('');
  };

  const onSubmit = () => {
    if (!testCaseId) return;
    record.mutate(
      {
        testCaseId,
        input: {
          status,
          actualResult: actualResult || undefined,
          notes: notes || undefined,
          testerName: testerName || undefined,
          attachmentUrls: parseUrlList(attachments),
          screenshotUrls: parseUrlList(screenshots),
          defectReference: defectReference || undefined,
          executionDurationMs: durationMinutes ? Math.round(Number(durationMinutes) * 60_000) : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: 'Execution recorded', description: `${testCaseTitle} — ${status}` });
          reset();
          onOpenChange(false);
        },
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
    <Dialog open={Boolean(testCaseId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record execution</DialogTitle>
          <DialogDescription className="truncate">{testCaseTitle}</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Result</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as (typeof STATUS_OPTIONS)[number])}>
              <SelectTrigger>
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
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="actualResult">Actual result</Label>
            <Input id="actualResult" value={actualResult} onChange={(e) => setActualResult(e.target.value)} placeholder="What actually happened" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Execution notes</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="testerName">Tester name</Label>
            <Input id="testerName" value={testerName} onChange={(e) => setTesterName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Execution time (minutes)</Label>
            <Input id="duration" type="number" min={0} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defectReference">Defect reference</Label>
            <Input id="defectReference" value={defectReference} onChange={(e) => setDefectReference(e.target.value)} placeholder="e.g. BUG-123" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments">Attachments (URLs, comma-separated)</Label>
            <Input id="attachments" value={attachments} onChange={(e) => setAttachments(e.target.value)} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="screenshots">Screenshots (URLs, comma-separated)</Label>
            <Input id="screenshots" value={screenshots} onChange={(e) => setScreenshots(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={record.isPending}>
            {record.isPending ? 'Recording…' : 'Record execution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
