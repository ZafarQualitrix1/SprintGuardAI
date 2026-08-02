'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Bookmark, Download, Sparkles, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { automationApi, useAutomationCandidates, useGenerateAutomation, useSaveAutomation } from '@/features/automation/api';
import { downloadFilesAsZip, slugify } from '@/features/automation/lib/download-framework';
import { AutomationFilterKey, AutomationFilters } from './automation-filters';
import { AutomationCandidateRow } from './automation-candidate-row';
import { AutomationPreviewDialog } from './automation-preview-dialog';
import type { AutomationCandidate } from '@sprintguard/shared';

function matchesFilter(candidate: AutomationCandidate, filter: AutomationFilterKey): boolean {
  switch (filter) {
    case 'API':
      return candidate.automationType === 'API';
    case 'UI':
      return candidate.automationType === 'UI';
    case 'HIGH_PRIORITY':
      return candidate.priority === 'HIGH' || candidate.priority === 'CRITICAL';
    case 'REGRESSION':
      return candidate.testType === 'REGRESSION';
    case 'SMOKE':
      return candidate.testType === 'SMOKE';
    default:
      return true;
  }
}

export function AutomationTab({ sprintId }: { sprintId: string }) {
  const { data: candidates, isLoading, isError, error } = useAutomationCandidates(sprintId);
  const [filter, setFilter] = useState<AutomationFilterKey>('ALL');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);

  const generate = useGenerateAutomation(sprintId);
  const save = useSaveAutomation(sprintId);

  const filtered = useMemo(() => (candidates ?? []).filter((c) => matchesFilter(c, filter)), [candidates, filter]);
  const selectedCandidates = filtered.filter((c) => selected.has(c.testCaseId));

  const toggleSelected = (testCaseId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(testCaseId)) {
        next.delete(testCaseId);
      } else {
        next.add(testCaseId);
      }
      return next;
    });

  const toggleSelectAll = () =>
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.testCaseId)),
    );

  const onBulkGenerate = async () => {
    setBulkWorking(true);
    let succeeded = 0;
    let failed = 0;
    // Sequential, not parallel: bounds concurrent load on the configured LLM provider (same
    // rationale as RunTestGenerationHandler on the backend).
    for (const candidate of selectedCandidates) {
      try {
        await generate.mutateAsync({ testCaseId: candidate.testCaseId, automationType: candidate.automationType as 'API' | 'UI' });
        succeeded++;
      } catch {
        failed++;
      }
    }
    setBulkWorking(false);
    toast({
      title: 'Bulk generation complete',
      description: `${succeeded} succeeded${failed ? `, ${failed} failed` : ''}`,
      variant: failed > 0 && succeeded === 0 ? 'destructive' : 'default',
    });
  };

  const onBulkSave = async () => {
    setBulkWorking(true);
    let saved = 0;
    for (const candidate of selectedCandidates) {
      const generation = candidate.automationType === 'API' ? candidate.latestApi : candidate.latestUi;
      if (!generation) continue;
      try {
        await save.mutateAsync(generation.id);
        saved++;
      } catch {
        // surfaced in the summary count below
      }
    }
    setBulkWorking(false);
    toast({ title: 'Bulk save complete', description: `${saved} saved` });
  };

  const onBulkDownload = async () => {
    setBulkWorking(true);
    const groups = [];
    let skipped = 0;
    for (const candidate of selectedCandidates) {
      const generation = candidate.automationType === 'API' ? candidate.latestApi : candidate.latestUi;
      if (!generation) {
        skipped++;
        continue;
      }
      try {
        const detail = await automationApi.detail(generation.id);
        groups.push({ folder: slugify(candidate.testCaseTitle), files: detail.files });
      } catch {
        skipped++;
      }
    }
    setBulkWorking(false);
    if (groups.length === 0) {
      toast({ variant: 'destructive', title: 'Nothing to download', description: 'Generate automation for the selected test cases first.' });
      return;
    }
    await downloadFilesAsZip('sprintguard-automation.zip', groups);
    if (skipped > 0) {
      toast({ title: 'Download ready', description: `${skipped} test case(s) skipped -- no automation generated yet.` });
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Couldn&apos;t load automation candidates</AlertTitle>
        <AlertDescription>{error instanceof ApiError ? error.message : 'Please try again.'}</AlertDescription>
      </Alert>
    );
  }

  if (!candidates || candidates.length === 0) {
    return (
      <EmptyState
        icon={Wand2}
        title="No automatable test cases yet"
        description="Generate tests in the Test Generator tab first -- cases the AI marks Automatable (API or UI) will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AutomationFilters value={filter} onChange={setFilter} />
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={selected.size === 0 || bulkWorking} onClick={onBulkGenerate}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Generate Automation
          </Button>
          <Button size="sm" variant="outline" disabled={selected.size === 0 || bulkWorking} onClick={onBulkDownload}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download Framework
          </Button>
          <Button size="sm" variant="outline" disabled={selected.size === 0 || bulkWorking} onClick={onBulkSave}>
            <Bookmark className="mr-1.5 h-3.5 w-3.5" />
            Save Automation
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="flex items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-primary"
            checked={filtered.length > 0 && selected.size === filtered.length}
            onChange={toggleSelectAll}
          />
          <span>
            {filtered.length} automatable test case{filtered.length === 1 ? '' : 's'}
            {selected.size > 0 ? ` · ${selected.size} selected` : ''}
          </span>
        </div>
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No test cases match this filter.
          </p>
        ) : (
          filtered.map((candidate) => (
            <AutomationCandidateRow
              key={candidate.testCaseId}
              sprintId={sprintId}
              candidate={candidate}
              selected={selected.has(candidate.testCaseId)}
              onToggleSelected={toggleSelected}
              onPreview={setPreviewId}
            />
          ))
        )}
      </div>

      <AutomationPreviewDialog automationGenerationId={previewId} onOpenChange={(open) => !open && setPreviewId(null)} />
    </div>
  );
}
