'use client';

import { Eye, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { useAutomationByTestCase } from '@/features/automation/api';

const statusVariant: Record<string, 'default' | 'secondary' | 'warning'> = {
  GENERATED: 'secondary',
  SAVED: 'default',
  COMMITTED: 'warning',
};

interface AutomationVersionHistoryDialogProps {
  testCaseId: string | null;
  testCaseLabel: string;
  onOpenChange: (open: boolean) => void;
  onPreview: (automationGenerationId: string) => void;
}

// Regenerating never loses history (createNextVersion always inserts, never overwrites) -- this is
// just a read-only view onto what's already there, opened from the grid's History action.
export function AutomationVersionHistoryDialog({
  testCaseId,
  testCaseLabel,
  onOpenChange,
  onPreview,
}: AutomationVersionHistoryDialogProps) {
  const { data: versions, isLoading } = useAutomationByTestCase(testCaseId ?? '', Boolean(testCaseId));

  return (
    <Dialog open={Boolean(testCaseId)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Version history
          </DialogTitle>
          <DialogDescription>{testCaseLabel}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !versions || versions.length === 0 ? (
          <EmptyState icon={History} title="No versions yet" description="Generate automation for this test case first." />
        ) : (
          <ol className="max-h-96 space-y-2 overflow-y-auto">
            {versions.map((version) => (
              <li key={version.id} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">v{version.version}</span>
                    <Badge variant={statusVariant[version.status] ?? 'secondary'}>{version.status}</Badge>
                    {version.isOutdated ? <Badge variant="warning">Outdated</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(version.createdAt).toLocaleString()}
                    {version.automationReadinessScore !== null ? ` · ${version.automationReadinessScore}% readiness` : ''}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onPreview(version.id)} title="Preview this version">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
