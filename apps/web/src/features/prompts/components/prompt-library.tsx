'use client';

import { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import type { PromptLibraryRow } from '@sprintguard/shared';
import { usePromptList } from '@/features/prompts/api';
import { CreatePromptDialog } from './create-prompt-dialog';
import { PromptDetail } from './prompt-detail';

function statusVariant(status: string): 'success' | 'warning' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'APPROVED') return 'secondary';
  if (status === 'IN_REVIEW') return 'warning';
  if (status === 'DEPRECATED') return 'destructive';
  return 'outline';
}

const STATUS_OPTIONS = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'DEPRECATED'];

export function PromptLibrary() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<{ capability: string; version: string } | null>(null);

  const { data, isLoading } = usePromptList({ search: search || undefined, status: status || undefined, page, pageSize: 25 });

  if (selected) {
    return <PromptDetail capability={selected.capability} initialVersion={selected.version} onBack={() => setSelected(null)} />;
  }

  const columns: DataTableColumn<PromptLibraryRow>[] = [
    {
      key: 'name',
      header: 'Prompt Name',
      render: (row) => (
        <div>
          <p className="font-medium">{row.name ?? row.capability}</p>
          <p className="text-xs text-muted-foreground">{row.capability}</p>
        </div>
      ),
      sortValue: (row) => row.name ?? row.capability,
    },
    { key: 'agent', header: 'AI Agent', render: (row) => row.agentName ?? '—' },
    { key: 'category', header: 'Category', render: (row) => row.category ?? '—' },
    { key: 'provider', header: 'Provider', render: (row) => row.provider ?? '—' },
    { key: 'model', header: 'Model', render: (row) => <span className="text-xs">{row.model ?? '—'}</span> },
    { key: 'version', header: 'Version', render: (row) => row.version },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
          {row.isActive ? <Badge variant="success">Live</Badge> : null}
        </div>
      ),
    },
    { key: 'createdBy', header: 'Created By', render: (row) => row.createdBy },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (row) => new Date(row.updatedAt).toLocaleDateString(),
      sortValue: (row) => row.updatedAt,
    },
    {
      key: 'lastUsedAt',
      header: 'Last Used',
      render: (row) => (row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleDateString() : 'Never'),
      sortValue: (row) => row.lastUsedAt ?? '',
    },
    { key: 'totalExecutions', header: 'Total Executions', render: (row) => row.totalExecutions, sortValue: (row) => row.totalExecutions },
    {
      key: 'successRate',
      header: 'Success Rate',
      render: (row) => (row.successRate !== null ? `${Math.round(row.successRate * 100)}%` : '—'),
      sortValue: (row) => row.successRate ?? -1,
    },
    {
      key: 'avgLatencyMs',
      header: 'Avg Response Time',
      render: (row) => (row.avgLatencyMs !== null ? `${Math.round(row.avgLatencyMs)}ms` : '—'),
      sortValue: (row) => row.avgLatencyMs ?? -1,
    },
    {
      key: 'avgTokens',
      header: 'Avg Token Usage',
      render: (row) => (row.avgTokens !== null ? Math.round(row.avgTokens) : '—'),
      sortValue: (row) => row.avgTokens ?? -1,
    },
    {
      key: 'avgConfidenceScore',
      header: 'Quality Score',
      render: (row) => (row.avgConfidenceScore !== null ? `${Math.round(row.avgConfidenceScore * 100)}%` : '—'),
      sortValue: (row) => row.avgConfidenceScore ?? -1,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search prompts…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-56"
          />
          <Select value={status} onValueChange={(v) => { setStatus(v === 'ALL' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-36">
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
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Prompt
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No prompts yet"
        emptyDescription="Create your first prompt to start managing AI agent behavior centrally."
        onRowClick={(row) => setSelected({ capability: row.capability, version: row.version })}
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
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(data.total / 25)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <CreatePromptDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(capability, version) => setSelected({ capability, version })}
      />

      {!isLoading && data?.rows.length === 0 && !search && !status ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Tip: existing built-in agents already have prompts seeded — try searching "requirement" or "test case".
        </p>
      ) : null}
    </div>
  );
}
