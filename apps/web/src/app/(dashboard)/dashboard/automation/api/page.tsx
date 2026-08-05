'use client';

import { useMemo, useState } from 'react';
import { Bookmark, Download, Play, Search, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import {
  automationApi,
  useApprovedApiAutomationCandidates,
  useGenerateApiAutomation,
  useSaveApiAutomation,
} from '@/features/automation/api';
import { downloadFilesAsZip, slugify } from '@/features/automation/lib/download-framework';
import {
  ApiAutomationFilters,
  ApiAutomationGrid,
  AutomationPreviewDialog,
  AutomationVersionHistoryDialog,
  ExecutionProgressPanel,
  RunAutomationDialog,
  type RunnableAutomationItem,
  type TrackedExecutionRun,
} from '@/features/automation/components';
import type { ApprovedApiAutomationCandidate, AutomationExecutionRun } from '@sprintguard/shared';

export default function ApiAutomationPage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [storyIds, setStoryIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [runItems, setRunItems] = useState<RunnableAutomationItem[] | null>(null);
  const [trackedRuns, setTrackedRuns] = useState<TrackedExecutionRun[]>([]);
  const [liveRunByTestCaseId, setLiveRunByTestCaseId] = useState<Map<string, AutomationExecutionRun>>(new Map());
  const [historyCandidate, setHistoryCandidate] = useState<ApprovedApiAutomationCandidate | null>(null);

  const { data: candidates, isLoading } = useApprovedApiAutomationCandidates({
    projectId: projectId ?? undefined,
    sprintId: sprintId ?? undefined,
    storyIds: storyIds.length > 0 ? storyIds : undefined,
  });
  const generate = useGenerateApiAutomation();
  const save = useSaveApiAutomation();

  const filtered = useMemo(() => {
    const all = candidates ?? [];
    if (!search.trim()) return all;
    const q = search.trim().toLowerCase();
    return all.filter(
      (c) =>
        c.testCaseTitle.toLowerCase().includes(q) ||
        c.storyTitle.toLowerCase().includes(q) ||
        (c.apiEndpoint ?? '').toLowerCase().includes(q) ||
        (c.displayId ?? '').toLowerCase().includes(q),
    );
  }, [candidates, search]);

  const selectedCandidates = filtered.filter((c) => selected.has(c.testCaseId));

  const onBulkGenerate = async () => {
    setBulkWorking(true);
    let succeeded = 0;
    let failed = 0;
    // Sequential, not parallel: bounds concurrent load on the configured LLM provider (same
    // rationale as every other bulk-generate action in this app).
    for (const candidate of selectedCandidates) {
      try {
        await generate.mutateAsync({ testCaseId: candidate.testCaseId, automationType: 'API' });
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

  const onBulkDownload = async () => {
    setBulkWorking(true);
    const groups = [];
    let skipped = 0;
    for (const candidate of selectedCandidates) {
      if (!candidate.latestGeneration) {
        skipped++;
        continue;
      }
      try {
        const detail = await automationApi.detail(candidate.latestGeneration.id);
        groups.push({ folder: slugify(candidate.testCaseTitle), files: detail.files });
      } catch {
        skipped++;
      }
    }
    setBulkWorking(false);
    if (groups.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing to download',
        description: 'Generate automation for the selected test cases first.',
      });
      return;
    }
    await downloadFilesAsZip('sprintguard-api-automation.zip', groups);
    if (skipped > 0) {
      toast({ title: 'Download ready', description: `${skipped} test case(s) skipped -- no automation generated yet.` });
    }
  };

  const onBulkSave = async () => {
    setBulkWorking(true);
    let saved = 0;
    for (const candidate of selectedCandidates) {
      if (!candidate.latestGeneration) continue;
      try {
        await save.mutateAsync(candidate.latestGeneration.id);
        saved++;
      } catch {
        // surfaced in the summary count below
      }
    }
    setBulkWorking(false);
    toast({ title: 'Bulk save complete', description: `${saved} saved` });
  };

  const toRunnableItem = (candidate: ApprovedApiAutomationCandidate): RunnableAutomationItem | null =>
    candidate.latestGeneration
      ? {
          testCaseId: candidate.testCaseId,
          storyId: candidate.storyId,
          generationId: candidate.latestGeneration.id,
          label: candidate.testCaseTitle,
        }
      : null;

  const onRunSingle = (candidate: ApprovedApiAutomationCandidate) => {
    const item = toRunnableItem(candidate);
    if (!item) return;
    setRunItems([item]);
  };

  const onBulkRun = () => {
    const items = selectedCandidates.map(toRunnableItem).filter((item): item is RunnableAutomationItem => item !== null);
    if (items.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing to run',
        description: 'Generate automation for the selected test cases first.',
      });
      return;
    }
    setRunItems(items);
  };

  const onTriggered = (runs: { testCaseId: string; label: string; run: AutomationExecutionRun }[]) => {
    setTrackedRuns((prev) => {
      const byTestCaseId = new Map(prev.map((r) => [r.testCaseId, r]));
      for (const r of runs) byTestCaseId.set(r.testCaseId, { testCaseId: r.testCaseId, label: r.label, runId: r.run.id });
      return Array.from(byTestCaseId.values());
    });
    setLiveRunByTestCaseId((prev) => {
      const next = new Map(prev);
      for (const r of runs) next.set(r.testCaseId, r.run);
      return next;
    });
  };

  const onRunUpdate = (testCaseId: string, run: AutomationExecutionRun) => {
    setLiveRunByTestCaseId((prev) => {
      if (prev.get(testCaseId)?.status === run.status && prev.get(testCaseId)?.id === run.id) return prev;
      const next = new Map(prev);
      next.set(testCaseId, run);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="API Automation"
        description="AI-generated Playwright API automation for BA-approved, locked test cases."
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <ApiAutomationFilters
            projectId={projectId}
            onProjectChange={setProjectId}
            sprintId={sprintId}
            onSprintChange={setSprintId}
            storyIds={storyIds}
            onStoryIdsChange={setStoryIds}
          />

          {!projectId ? null : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search test case, story, endpoint…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
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
                  <Button size="sm" variant="outline" disabled={selected.size === 0 || bulkWorking} onClick={onBulkRun}>
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    Run Automation
                  </Button>
                </div>
              </div>

              <ApiAutomationGrid
                candidates={filtered}
                isLoading={isLoading}
                selected={selected}
                onSelectionChange={setSelected}
                onPreview={setPreviewId}
                onRun={onRunSingle}
                onVersionHistory={setHistoryCandidate}
                latestRunByTestCaseId={liveRunByTestCaseId}
              />
            </>
          )}
        </CardContent>
      </Card>

      <ExecutionProgressPanel runs={trackedRuns} onRunUpdate={onRunUpdate} />

      <RunAutomationDialog
        open={runItems !== null}
        onOpenChange={(open) => !open && setRunItems(null)}
        items={runItems ?? []}
        onTriggered={onTriggered}
      />

      <AutomationVersionHistoryDialog
        testCaseId={historyCandidate?.testCaseId ?? null}
        testCaseLabel={historyCandidate?.testCaseTitle ?? ''}
        onOpenChange={(open) => !open && setHistoryCandidate(null)}
        onPreview={setPreviewId}
      />

      <AutomationPreviewDialog automationGenerationId={previewId} onOpenChange={(open) => !open && setPreviewId(null)} />
    </div>
  );
}
