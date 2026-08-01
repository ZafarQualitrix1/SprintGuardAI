'use client';

import { Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/layout/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useAiAgents, useDisableAgent, useEnableAgent } from '@/features/ai-settings/api';

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
  return rtf.format(Math.round(diffHr / 24), 'day');
}

export function AgentsPanel() {
  const { data: agents, isLoading, isError } = useAiAgents();
  const enable = useEnableAgent();
  const disable = useDisableAgent();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError || !agents) {
    return <p className="text-sm text-destructive">Could not load agents.</p>;
  }

  if (agents.length === 0) {
    return (
      <EmptyState icon={Bot} title="No agents registered" description="Run `pnpm db:seed` to load the agent catalog." />
    );
  }

  const handleToggle = (key: string, currentStatus: string) => {
    const mutation = currentStatus === 'ENABLED' ? disable : enable;
    mutation.mutate(key, {
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not update agent',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });
  };

  return (
    <Card>
      <CardContent className="divide-y p-0">
        {agents.map((agent) => (
          <div key={agent.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{agent.name}</p>
                <Badge variant={agent.status === 'ENABLED' ? 'success' : agent.status === 'DISABLED' ? 'outline' : 'secondary'}>
                  {agent.status}
                </Badge>
              </div>
              {agent.description ? <p className="mt-1 text-xs text-muted-foreground">{agent.description}</p> : null}
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                <div>
                  <dt>Executions</dt>
                  <dd className="text-foreground">{agent.totalExecutions.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Success rate</dt>
                  <dd className="text-foreground">{agent.successRate}%</dd>
                </div>
                <div>
                  <dt>Avg confidence</dt>
                  <dd className="text-foreground">
                    {agent.avgConfidenceScore !== null ? `${Math.round(agent.avgConfidenceScore * 100)}%` : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Last run</dt>
                  <dd className="text-foreground">{timeAgo(agent.lastExecutionAt)}</dd>
                </div>
              </dl>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleToggle(agent.key, agent.status)}
              disabled={enable.isPending || disable.isPending}
            >
              {agent.status === 'ENABLED' ? 'Disable' : 'Enable'}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
