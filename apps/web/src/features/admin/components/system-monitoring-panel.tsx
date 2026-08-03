'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAiProviders } from '@/features/ai-settings/api';
import { useIntegrationConnections } from '@/features/integration/api';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/v\d+$/, '');

interface HealthCheckResponse {
  status: string;
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string }>;
}

function useApiHealth() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async (): Promise<HealthCheckResponse> => {
      const response = await fetch(`${API_BASE_URL}/health/ready`);
      return response.json();
    },
    refetchInterval: 30000,
  });
}

function statusVariant(status: string): 'success' | 'warning' | 'destructive' | 'outline' {
  if (status === 'HEALTHY' || status === 'up' || status === 'CONNECTED') return 'success';
  if (status === 'DEGRADED') return 'warning';
  if (status === 'UNHEALTHY' || status === 'down' || status === 'ERROR') return 'destructive';
  return 'outline';
}

function Row({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3 text-sm">
      <span>{label}</span>
      <Badge variant={statusVariant(status)}>{status}</Badge>
    </div>
  );
}

export function SystemMonitoringPanel() {
  const { data: health, isLoading: healthLoading, isError: healthError } = useApiHealth();
  const { data: providers, isLoading: providersLoading } = useAiProviders();
  const { data: connections, isLoading: connectionsLoading } = useIntegrationConnections();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Core Infrastructure</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {healthLoading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : healthError || !health ? (
            <p className="text-sm text-destructive">Could not reach the API health endpoint.</p>
          ) : (
            Object.entries({ ...health.info, ...health.error }).map(([name, indicator]) => (
              <Row key={name} label={name} status={indicator.status} />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">AI Providers</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {providersLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            providers
              ?.filter((p) => p.supported)
              .map((p) => <Row key={p.provider} label={p.displayName} status={p.healthStatus} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Integrations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {connectionsLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : !connections || connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No integrations connected.</p>
          ) : (
            connections.map((c) => <Row key={c.id} label={c.name} status={c.healthStatus} />)
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        CPU/memory/storage OS-level metrics aren&apos;t shown -- this API runs as Vercel serverless functions, which
        don&apos;t expose meaningful per-instance system metrics the way a persistent server would.
      </p>
    </div>
  );
}
