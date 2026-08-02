'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import type { PromptExecutionRow } from '@sprintguard/shared';
import { usePromptExecutions } from '@/features/prompts/api';
import { exportExecutionsToCsv } from '../lib/export-executions-csv';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

function statusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'FLAGGED_FOR_REVIEW') return 'warning';
  if (status === 'FAILED') return 'destructive';
  return 'secondary';
}

const STATUS_OPTIONS = ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'RETRYING', 'FLAGGED_FOR_REVIEW'];

export function ExecutionHistory() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePromptExecutions({ search: search || undefined, status: status || undefined, page, pageSize: 25 });

  const columns: DataTableColumn<PromptExecutionRow>[] = [
    { key: 'timestamp', header: 'Timestamp', render: (row) => new Date(row.timestamp).toLocaleString(), sortValue: (row) => row.timestamp },
    {
      key: 'capability',
      header: 'AI Agent',
      render: (row) => (
        <div>
          <p className="font-medium">{row.capability}</p>
          {row.isPlayground ? <Badge variant="outline">Playground</Badge> : null}
        </div>
      ),
    },
    { key: 'promptVersion', header: 'Prompt Version', render: (row) => row.promptVersion ?? '—' },
    { key: 'provider', header: 'Provider', render: (row) => row.provider },
    { key: 'model', header: 'Model', render: (row) => <span className="text-xs">{row.model}</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge> },
    { key: 'latencyMs', header: 'Execution Time', render: (row) => (row.latencyMs !== null ? `${row.latencyMs}ms` : '—'), sortValue: (row) => row.latencyMs ?? -1 },
    { key: 'totalTokens', header: 'Total Tokens', render: (row) => row.totalTokens ?? '—', sortValue: (row) => row.totalTokens ?? -1 },
    { key: 'costUsd', header: 'Est. Cost', render: (row) => (row.costUsd !== null ? `$${row.costUsd.toFixed(4)}` : '—'), sortValue: (row) => row.costUsd ?? -1 },
    {
      key: 'confidenceScore',
      header: 'Confidence',
      render: (row) => (row.confidenceScore !== null ? `${Math.round(row.confidenceScore * 100)}%` : '—'),
      sortValue: (row) => row.confidenceScore ?? -1,
    },
    { key: 'failureReason', header: 'Failure Reason', render: (row) => (row.failureReason ? <span className="text-xs text-destructive">{row.failureReason}</span> : '—') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search executions…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-56" />
          <Select value={status} onValueChange={(v) => { setStatus(v === 'ALL' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportExecutionsToCsv(data?.rows ?? [])} disabled={!data?.rows.length}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No executions yet"
        emptyDescription="Execution history appears here once agents start running, including Playground test runs."
      />

      {data && data.total > 25 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {Math.ceil(data.total / 25)} ({data.total} total)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(data.total / 25)} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
