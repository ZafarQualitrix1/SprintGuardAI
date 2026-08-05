'use client';

import { Bookmark, Download, Eye, History, Play, RefreshCw, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { automationApi, useGenerateApiAutomation, useSaveApiAutomation } from '@/features/automation/api';
import { downloadFilesAsZip, slugify } from '@/features/automation/lib/download-framework';
import type { ApprovedApiAutomationCandidate, AutomationExecutionRun } from '@sprintguard/shared';

const EXECUTION_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'warning'> = {
  QUEUED: 'secondary',
  RUNNING: 'default',
  PASSED: 'success',
  FAILED: 'destructive',
  ERROR: 'destructive',
  CANCELLED: 'warning',
};

const priorityVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'warning',
  CRITICAL: 'destructive',
};

function AutomationStatusBadge({ candidate }: { candidate: ApprovedApiAutomationCandidate }) {
  if (candidate.latestGeneration?.isOutdated) {
    return <Badge variant="warning">Outdated</Badge>;
  }
  if (!candidate.latestGeneration) {
    return <Badge variant="secondary">Not Automated</Badge>;
  }
  if (candidate.latestGeneration.status === 'SAVED' || candidate.latestGeneration.status === 'COMMITTED') {
    return <Badge variant="default">Generated</Badge>;
  }
  return <Badge variant="outline">Generated</Badge>;
}

interface ApiAutomationGridProps {
  candidates: ApprovedApiAutomationCandidate[];
  isLoading: boolean;
  selected: Set<string>;
  onSelectionChange: (keys: Set<string>) => void;
  onPreview: (automationGenerationId: string) => void;
  onRun: (candidate: ApprovedApiAutomationCandidate) => void;
  onVersionHistory: (candidate: ApprovedApiAutomationCandidate) => void;
  // Runs triggered so far this session, keyed by testCaseId -- the candidates list itself doesn't
  // carry execution history (that lives in a separate story-scoped table), so this is best-effort:
  // it reflects what's been run since the page loaded, not full persisted history.
  latestRunByTestCaseId: Map<string, AutomationExecutionRun>;
}

export function ApiAutomationGrid({
  candidates,
  isLoading,
  selected,
  onSelectionChange,
  onPreview,
  onRun,
  onVersionHistory,
  latestRunByTestCaseId,
}: ApiAutomationGridProps) {
  const generate = useGenerateApiAutomation();
  const save = useSaveApiAutomation();

  const onGenerate = (candidate: ApprovedApiAutomationCandidate) =>
    generate.mutate(
      { testCaseId: candidate.testCaseId, automationType: 'API' },
      {
        onSuccess: () =>
          toast({
            title: candidate.latestGeneration ? 'Automation regenerated' : 'Automation generated',
            description: candidate.testCaseTitle,
          }),
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not generate automation',
            description: error instanceof ApiError ? error.message : undefined,
          }),
      },
    );

  const onSave = (candidate: ApprovedApiAutomationCandidate) => {
    if (!candidate.latestGeneration) return;
    save.mutate(candidate.latestGeneration.id, {
      onSuccess: () => toast({ title: 'Automation saved', description: candidate.testCaseTitle }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not save automation',
          description: error instanceof ApiError ? error.message : undefined,
        }),
    });
  };

  const onDownload = async (candidate: ApprovedApiAutomationCandidate) => {
    if (!candidate.latestGeneration) return;
    try {
      const detail = await automationApi.detail(candidate.latestGeneration.id);
      await downloadFilesAsZip(`${slugify(candidate.testCaseTitle)}-automation.zip`, [
        { folder: slugify(candidate.testCaseTitle), files: detail.files },
      ]);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not download framework',
        description: error instanceof ApiError ? error.message : undefined,
      });
    }
  };

  const columns: DataTableColumn<ApprovedApiAutomationCandidate>[] = [
    {
      key: 'testCaseId',
      header: 'Test Case ID',
      render: (c) => <span className="whitespace-nowrap font-mono text-xs">{c.displayId ?? c.testCaseId.slice(0, 8)}</span>,
      sortValue: (c) => c.displayId ?? c.testCaseId,
    },
    {
      key: 'storyId',
      header: 'User Story ID',
      render: (c) => <span className="whitespace-nowrap font-mono text-xs">{c.storyExternalId ?? c.storyId.slice(0, 8)}</span>,
      sortValue: (c) => c.storyExternalId ?? c.storyId,
    },
    {
      key: 'storyTitle',
      header: 'User Story Name',
      render: (c) => <span className="block max-w-[160px] truncate">{c.storyTitle}</span>,
      sortValue: (c) => c.storyTitle,
    },
    {
      key: 'apiName',
      header: 'API Name',
      render: (c) => <span className="block max-w-[180px] truncate">{c.testCaseTitle}</span>,
      sortValue: (c) => c.testCaseTitle,
    },
    {
      key: 'apiEndpoint',
      header: 'Endpoint',
      render: (c) => <span className="block max-w-[160px] truncate font-mono text-xs">{c.apiEndpoint ?? '—'}</span>,
      sortValue: (c) => c.apiEndpoint ?? '',
    },
    {
      key: 'requestMethod',
      header: 'HTTP Method',
      render: (c) => (c.requestMethod ? <Badge variant="outline">{c.requestMethod}</Badge> : '—'),
      sortValue: (c) => c.requestMethod ?? '',
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (c) => <Badge variant={priorityVariant[c.priority] ?? 'default'}>{c.priority}</Badge>,
      sortValue: (c) => c.priority,
    },
    {
      key: 'automationStatus',
      header: 'Automation Status',
      render: (c) => <AutomationStatusBadge candidate={c} />,
    },
    {
      key: 'executionStatus',
      header: 'Execution Status',
      render: (c) => {
        const run = latestRunByTestCaseId.get(c.testCaseId);
        return run ? (
          <Badge variant={EXECUTION_STATUS_VARIANT[run.status] ?? 'secondary'}>{run.status}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Not Run</span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      render: (c) => <span className="whitespace-nowrap text-xs">{new Date(c.createdAt).toLocaleDateString()}</span>,
      sortValue: (c) => c.createdAt,
    },
    {
      key: 'updatedAt',
      header: 'Updated Date',
      render: (c) => <span className="whitespace-nowrap text-xs">{new Date(c.updatedAt).toLocaleDateString()}</span>,
      sortValue: (c) => c.updatedAt,
    },
    {
      key: 'lastGenerated',
      header: 'Last Generated',
      render: (c) =>
        c.latestGeneration ? (
          <span className="whitespace-nowrap text-xs">{new Date(c.latestGeneration.createdAt).toLocaleDateString()}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
      sortValue: (c) => c.latestGeneration?.createdAt ?? '',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={generate.isPending} onClick={() => onGenerate(c)}>
            {c.latestGeneration ? <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            {c.latestGeneration ? 'Regenerate' : 'Generate'}
          </Button>
          {c.latestGeneration ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => onPreview(c.latestGeneration!.id)} title="Preview code">
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDownload(c)} title="Download framework">
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={save.isPending || c.latestGeneration.status !== 'GENERATED'}
                onClick={() => onSave(c)}
                title="Save automation"
              >
                <Bookmark className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onRun(c)} title="Run automation">
                <Play className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onVersionHistory(c)} title="Version history">
                <History className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={candidates}
      rowKey={(c) => c.testCaseId}
      isLoading={isLoading}
      emptyTitle="No BA-approved test cases yet"
      emptyDescription="API test cases appear here once their story is BA-approved and locked in the Review workflow."
      selectable
      selectedKeys={selected}
      onSelectionChange={onSelectionChange}
    />
  );
}
