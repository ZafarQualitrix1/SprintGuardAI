'use client';

import Link from 'next/link';
import type { PromptLibraryRow } from '@sprintguard/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/layout/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { usePromptList, useApprovePrompt, useRejectPrompt } from '@/features/prompts/api';

function PendingPromptRow({ row }: { row: PromptLibraryRow }) {
  const approve = useApprovePrompt(row.capability, row.version);
  const reject = useRejectPrompt(row.capability, row.version);

  const onError = (title: string) => (error: unknown) =>
    toast({ variant: 'destructive', title, description: error instanceof ApiError ? error.message : 'Something went wrong.' });

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
      <div>
        <p className="font-medium">{row.name ?? row.capability}</p>
        <p className="text-xs text-muted-foreground">
          {row.capability} · v{row.version} · by {row.createdBy}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => reject.mutate('Rejected from Admin Console', { onError: onError('Could not reject prompt') })}
          disabled={reject.isPending || approve.isPending}
        >
          Reject
        </Button>
        <Button
          size="sm"
          onClick={() => approve.mutate(undefined, { onError: onError('Could not approve prompt') })}
          disabled={approve.isPending || reject.isPending}
        >
          Approve
        </Button>
      </div>
    </div>
  );
}

export function PromptApprovalsWidget() {
  const { data, isLoading } = usePromptList({ status: 'IN_REVIEW', pageSize: 10 });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Pending Prompt Approvals</CardTitle>
        <Link href="/dashboard/settings/prompts" className="text-xs text-muted-foreground underline hover:text-foreground">
          Open Prompt Management
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !data || data.rows.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nothing pending" description="No prompts are currently awaiting approval." />
        ) : (
          data.rows.map((row) => <PendingPromptRow key={row.id} row={row} />)
        )}
        {data && data.total > data.rows.length ? (
          <p className="text-xs text-muted-foreground">
            <Badge variant="secondary">{data.total - data.rows.length} more</Badge> in Prompt Management.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
