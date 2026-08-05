'use client';

import { ChevronDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { downloadBlob } from '@/lib/download';
import { automationExecutionApi, type ExecutionReportFormat } from '@/features/automation-execution/api';
import type { AutomationExecutionRun } from '@sprintguard/shared';

const EXTENSIONS: Record<ExecutionReportFormat, string> = { excel: 'xlsx', extent: 'html', junit: 'xml' };

// HTML and JSON need no server request (HTML opens the existing GitHub Actions artifact link,
// JSON is just the run object serialized client-side); Excel/Extent/JUnit are generated server-side
// by ExecutionReportService from the run's already-persisted results.
export function ExecutionReportDownloads({ run }: { run: AutomationExecutionRun }) {
  const isTerminal = run.status !== 'QUEUED' && run.status !== 'RUNNING';

  const onDownloadJson = () => {
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `automation-report-${run.id}.json`);
  };

  const onDownloadServerFormat = async (format: ExecutionReportFormat) => {
    try {
      const blob = await automationExecutionApi.downloadReport(run.id, format);
      downloadBlob(blob, `automation-report-${run.id}.${EXTENSIONS[format]}`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not download report',
        description: error instanceof ApiError ? error.message : undefined,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={!isTerminal}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Download Report
          <ChevronDown className="ml-1.5 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {run.reportArtifactUrl ? (
          <DropdownMenuItem asChild>
            <a href={run.reportArtifactUrl} target="_blank" rel="noreferrer">
              HTML Report
            </a>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={onDownloadJson}>JSON Report</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDownloadServerFormat('excel')}>Excel Report</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDownloadServerFormat('extent')}>Extent Report</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDownloadServerFormat('junit')}>JUnit XML</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
