'use client';

import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/layout/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAiLogs } from '@/features/ai-settings/api';

function statusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'FLAGGED_FOR_REVIEW') return 'warning';
  if (status === 'FAILED') return 'destructive';
  return 'secondary';
}

export function LogsPanel() {
  const [date, setDate] = useState('');
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useAiLogs({
    date: date || undefined,
    provider: provider || undefined,
    status: status || undefined,
    page,
    pageSize: 25,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="log-date" className="text-xs">
            Date
          </Label>
          <Input
            id="log-date"
            type="date"
            className="h-9 w-40"
            value={date}
            onChange={(e) => {
              setPage(1);
              setDate(e.target.value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="log-provider" className="text-xs">
            Provider
          </Label>
          <Input
            id="log-provider"
            placeholder="e.g. google"
            className="h-9 w-36"
            value={provider}
            onChange={(e) => {
              setPage(1);
              setProvider(e.target.value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="log-status" className="text-xs">
            Status
          </Label>
          <Input
            id="log-status"
            placeholder="e.g. SUCCEEDED"
            className="h-9 w-40"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          />
        </div>
        {date || provider || status ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDate('');
              setProvider('');
              setStatus('');
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : isError || !data ? (
        <p className="text-sm text-destructive">Could not load AI request logs.</p>
      ) : data.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="No matching logs" description="No AI requests found for these filters." />
      ) : (
        <>
          <Card>
            <CardContent className="max-h-[32rem] divide-y overflow-y-auto p-0">
              {data.items.map((entry) => (
                <div key={entry.agentRunId} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{entry.module}</span>
                      <Badge variant={statusVariant(entry.status)}>{entry.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()} · {entry.provider ?? '—'} / {entry.model ?? '—'}
                      {entry.promptVersion ? ` · prompt ${entry.promptVersion}` : ''}
                    </p>
                    {entry.error ? (
                      <p className="mt-0.5 truncate text-xs text-destructive" title={entry.error}>
                        {entry.error}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <p>{entry.executionTimeMs ? `${entry.executionTimeMs}ms` : '—'}</p>
                    <p>{entry.tokensUsed ? `${entry.tokensUsed.toLocaleString()} tokens` : '—'}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {data.page} · {data.total.toLocaleString()} total
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page * data.pageSize >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
