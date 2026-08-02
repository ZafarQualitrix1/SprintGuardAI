'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePromptHistory } from '@/features/prompts/api';

function statusColor(status: string): 'success' | 'warning' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'APPROVED') return 'secondary';
  if (status === 'IN_REVIEW') return 'warning';
  if (status === 'DEPRECATED') return 'destructive';
  return 'outline';
}

interface VersionHistoryProps {
  capability: string;
  selectedVersion: string;
  onSelectVersion: (version: string) => void;
}

export function VersionHistory({ capability, selectedVersion, onSelectVersion }: VersionHistoryProps) {
  const { data: versions, isLoading } = usePromptHistory(capability);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-2">
      {(versions ?? []).map((v) => (
        <div
          key={v.id}
          className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 ${v.version === selectedVersion ? 'border-primary' : ''}`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{v.version}</span>
              <Badge variant={statusColor(v.status)}>{v.status}</Badge>
              {v.isActive ? <Badge variant="success">Live</Badge> : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {v.createdBy} · {new Date(v.createdAt).toLocaleString()}
            </p>
            {v.changeSummary ? <p className="text-xs italic text-muted-foreground">{v.changeSummary}</p> : null}
          </div>
          <Button size="sm" variant={v.version === selectedVersion ? 'default' : 'outline'} onClick={() => onSelectVersion(v.version)}>
            {v.version === selectedVersion ? 'Viewing' : 'Open'}
          </Button>
        </div>
      ))}
    </div>
  );
}
