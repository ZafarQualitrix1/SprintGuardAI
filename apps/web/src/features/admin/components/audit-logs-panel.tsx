'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import type { AuditLogEntry } from '@sprintguard/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuditLogs, useExportAuditLogs } from '@/features/admin/api';

export function AuditLogsPanel() {
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLogs({ action: action || undefined, targetType: targetType || undefined, page, pageSize: 25 });
  const exportLogs = useExportAuditLogs();

  const handleExport = () =>
    exportLogs.mutate(
      { action: action || undefined, targetType: targetType || undefined },
      {
        onSuccess: (csv) => {
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        },
        onError: () => toast({ variant: 'destructive', title: 'Could not export audit logs' }),
      },
    );

  const columns: DataTableColumn<AuditLogEntry>[] = [
    { key: 'createdAt', header: 'Timestamp', render: (e) => new Date(e.createdAt).toLocaleString(), sortValue: (e) => e.createdAt },
    { key: 'actorEmail', header: 'User', render: (e) => e.actorEmail ?? 'System' },
    { key: 'action', header: 'Action', render: (e) => <span className="font-mono text-xs">{e.action}</span> },
    { key: 'targetType', header: 'Module', render: (e) => e.targetType },
    { key: 'organizationName', header: 'Organization', render: (e) => e.organizationName },
    { key: 'ipAddress', header: 'IP Address', render: (e) => e.ipAddress ?? '—' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Audit Logs</CardTitle>
        <Button size="sm" variant="outline" onClick={handleExport} disabled={exportLogs.isPending}>
          <Download className="mr-1.5 h-4 w-4" /> {exportLogs.isPending ? 'Exporting…' : 'Export CSV'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="audit-action" className="text-xs">Action</Label>
            <Input id="audit-action" placeholder="e.g. member.invited" className="h-8 w-52" value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-target" className="text-xs">Module (target type)</Label>
            <Input id="audit-target" placeholder="e.g. User" className="h-8 w-40" value={targetType} onChange={(e) => { setPage(1); setTargetType(e.target.value); }} />
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(e) => e.id}
          isLoading={isLoading}
          emptyDescription="No audit log entries found for these filters."
        />
        {data ? (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Page {data.page} · {data.total.toLocaleString()} total</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={data.page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
