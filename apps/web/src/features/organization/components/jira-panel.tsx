'use client';

import { Plug } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/layout/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useIntegrationConnections, useTestConnection } from '@/features/integration/api';
import { useOrganizationSettings, useUpsertOrganizationSettings } from '@/features/organization/api';

function healthVariant(status: string): 'success' | 'warning' | 'destructive' | 'outline' {
  if (status === 'HEALTHY') return 'success';
  if (status === 'DEGRADED') return 'warning';
  if (status === 'UNHEALTHY') return 'destructive';
  return 'outline';
}

export function JiraPanel() {
  const { data: connections, isLoading: connectionsLoading } = useIntegrationConnections();
  const { data: settings, isLoading: settingsLoading } = useOrganizationSettings();
  const test = useTestConnection();
  const upsert = useUpsertOrganizationSettings();

  const toggle = (field: 'importSprintsEnabled' | 'importUserStoriesEnabled' | 'importBugsEnabled' | 'importTestEvidenceEnabled' | 'jiraAutoSyncEnabled', value: boolean) => {
    upsert.mutate(
      { [field]: value },
      {
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not save',
            description: error instanceof ApiError ? error.message : 'Something went wrong.',
          }),
      },
    );
  };

  if (connectionsLoading || settingsLoading || !settings) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Connected Jira Instances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!connections || connections.length === 0 ? (
            <EmptyState
              icon={Plug}
              title="No Jira workspace connected"
              description="Connect a Jira workspace from the Integrations area to enable sprint/story/bug import."
            />
          ) : (
            connections.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{connection.name}</p>
                  <p className="text-xs text-muted-foreground">{connection.siteUrl}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last sync: {connection.lastSyncedAt ? new Date(connection.lastSyncedAt).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={healthVariant(connection.healthStatus)}>{connection.healthStatus}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      test.mutate(connection.id, {
                        onSuccess: (result) =>
                          toast({
                            title: result.healthStatus === 'HEALTHY' ? 'Connection healthy' : 'Connection unhealthy',
                            variant: result.healthStatus === 'HEALTHY' ? 'default' : 'destructive',
                          }),
                      })
                    }
                    disabled={test.isPending}
                  >
                    Sync Now
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Import Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { field: 'importSprintsEnabled' as const, label: 'Import Sprint Configuration', value: settings.importSprintsEnabled },
            { field: 'importUserStoriesEnabled' as const, label: 'Import User Stories Configuration', value: settings.importUserStoriesEnabled },
            { field: 'importBugsEnabled' as const, label: 'Import Bugs Configuration', value: settings.importBugsEnabled },
            { field: 'importTestEvidenceEnabled' as const, label: 'Import Test Evidence Configuration', value: settings.importTestEvidenceEnabled },
            { field: 'jiraAutoSyncEnabled' as const, label: 'Auto Sync', value: settings.jiraAutoSyncEnabled },
          ].map((row) => (
            <div key={row.field} className="flex items-center gap-2">
              <Checkbox
                id={row.field}
                checked={row.value}
                onCheckedChange={(checked) => toggle(row.field, checked === true)}
              />
              <Label htmlFor={row.field} className="font-normal">
                {row.label}
              </Label>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            These preferences are saved immediately. Auto Sync runs on a 30-minute background schedule once a Redis
            queue is configured for this environment (Admin Console → Background Jobs).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
