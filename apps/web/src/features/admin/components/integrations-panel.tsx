'use client';

import { Github, Mail, MessageSquare, Plug, Slack, Triangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAiProviders } from '@/features/ai-settings/api';
import { useIntegrationConnections } from '@/features/integration/api';

const NOT_YET_INTEGRATED = [
  { key: 'github', name: 'GitHub', icon: Github },
  { key: 'slack', name: 'Slack', icon: Slack },
  { key: 'teams', name: 'Microsoft Teams', icon: MessageSquare },
  { key: 'email', name: 'Email', icon: Mail },
  { key: 'vercel', name: 'Vercel', icon: Triangle },
];

function healthVariant(status: string): 'success' | 'warning' | 'destructive' | 'outline' {
  if (status === 'HEALTHY') return 'success';
  if (status === 'DEGRADED') return 'warning';
  if (status === 'UNHEALTHY') return 'destructive';
  return 'outline';
}

export function IntegrationsPanel() {
  const { data: connections, isLoading: connectionsLoading } = useIntegrationConnections();
  const { data: providers, isLoading: providersLoading } = useAiProviders();

  if (connectionsLoading || providersLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {connections?.map((connection) => (
        <Card key={connection.id}>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{connection.name}</h3>
              <p className="truncate text-xs text-muted-foreground">Jira</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <Badge variant={healthVariant(connection.healthStatus)}>{connection.healthStatus}</Badge>
            <p>Last sync: {connection.lastSyncedAt ? new Date(connection.lastSyncedAt).toLocaleString() : 'Never'}</p>
          </CardContent>
        </Card>
      ))}

      {providers
        ?.filter((p) => p.supported)
        .map((provider) => (
          <Card key={provider.provider}>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <Plug className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">{provider.displayName}</h3>
                <p className="truncate text-xs text-muted-foreground">AI Provider</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <Badge variant={healthVariant(provider.healthStatus)}>{provider.healthStatus}</Badge>
              <p>{provider.isEnabled ? 'Enabled' : 'Disabled'}</p>
            </CardContent>
          </Card>
        ))}

      {NOT_YET_INTEGRATED.map(({ key, name, icon: Icon }) => (
        <Card key={key} className="opacity-60">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{name}</h3>
              <Badge variant="outline" className="mt-1">Not yet integrated</Badge>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
