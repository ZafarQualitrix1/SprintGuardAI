'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import {
  useBackgroundJobsOverview,
  usePauseQueue,
  useRemoveJob,
  useResumeQueue,
  useRetryJob,
} from '@/features/admin/api';

function statusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (status === 'completed') return 'success';
  if (status === 'active' || status === 'waiting') return 'secondary';
  if (status === 'failed') return 'destructive';
  return 'warning';
}

export function BackgroundJobsPanel() {
  const { data: queues, isLoading } = useBackgroundJobsOverview();
  const retry = useRetryJob();
  const remove = useRemoveJob();
  const pause = usePauseQueue();
  const resume = useResumeQueue();

  const onError = (title: string) => (error: unknown) =>
    toast({ variant: 'destructive', title, description: error instanceof ApiError ? error.message : 'Something went wrong.' });

  if (isLoading || !queues) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Requires a real Redis reachable from this API process. Every local env file in this repo points at
        redis://localhost:6379 by default -- UAT/prod need a managed Redis provisioned before these queues process
        anything beyond your local machine.
      </p>
      {queues.map((queue) => (
        <Card key={queue.name}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">{queue.name}</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => pause.mutate(queue.name, { onError: onError('Could not pause queue') })}>
                Pause
              </Button>
              <Button size="sm" variant="outline" onClick={() => resume.mutate(queue.name, { onError: onError('Could not resume queue') })}>
                Resume
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {Object.entries(queue.counts).map(([status, count]) => (
                <span key={status}>
                  {status}: <span className="text-foreground">{count}</span>
                </span>
              ))}
            </div>
            {queue.recentJobs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent jobs.</p>
            ) : (
              <div className="space-y-1.5">
                {queue.recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between rounded-md border p-2 text-xs">
                    <div>
                      <span className="font-mono">{job.name}</span> <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                      {job.failedReason ? <p className="mt-0.5 text-destructive">{job.failedReason}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      {job.status === 'failed' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => retry.mutate({ queue: queue.name, jobId: job.id }, { onError: onError('Could not retry job') })}
                        >
                          Retry
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove.mutate({ queue: queue.name, jobId: job.id }, { onError: onError('Could not remove job') })}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
