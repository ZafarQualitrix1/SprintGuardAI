'use client';

import { useState } from 'react';
import type { AiProviderSummary } from '@sprintguard/shared';
import { Bot, Brain, Sparkles, Cpu, Settings2, Star, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useDisableProvider, useEnableProvider, useSetDefaultProvider, useTestProviderConnection } from '@/features/ai-settings/api';
import { ProviderHealthBadge } from './provider-status-badge';
import { ProviderConfigDialog } from './provider-config-dialog';

const PROVIDER_ICONS: Record<string, typeof Sparkles> = {
  google: Sparkles,
  openai: Brain,
  anthropic: Bot,
};

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

interface ProviderCardProps {
  provider: AiProviderSummary;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const enable = useEnableProvider();
  const disable = useDisableProvider();
  const setDefault = useSetDefaultProvider();
  const test = useTestProviderConnection();

  const Icon = PROVIDER_ICONS[provider.provider] ?? Cpu;

  if (!provider.supported) {
    return (
      <Card className="opacity-60">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <Cpu className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{provider.displayName}</h3>
            <Badge variant="outline" className="mt-1">
              Not yet integrated
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          No SDK connector wired up yet -- shown here as a preview of planned provider coverage.
        </CardContent>
      </Card>
    );
  }

  const handleEnableToggle = () => {
    const mutation = provider.isEnabled ? disable : enable;
    mutation.mutate(provider.provider, {
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: provider.isEnabled ? 'Could not disable provider' : 'Could not enable provider',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });
  };

  const handleSetDefault = () =>
    setDefault.mutate(provider.provider, {
      onSuccess: () => toast({ title: 'Default provider updated', description: provider.displayName }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not set default',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });

  const handleTest = () =>
    test.mutate(provider.provider, {
      onSuccess: (result) =>
        toast({
          title: result.healthStatus === 'HEALTHY' ? 'Connection healthy' : 'Connection failed',
          description: result.error ?? `Responded in ${result.latencyMs}ms using ${result.model}.`,
          variant: result.healthStatus === 'HEALTHY' ? 'default' : 'destructive',
        }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Test failed',
          description: error instanceof ApiError ? error.message : 'Could not test this provider.',
        }),
    });

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold leading-none">{provider.displayName}</h3>
                {provider.isDefault ? (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-current" /> Default
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {provider.defaultModel ?? 'No default model set'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setConfigOpen(true)}>
            <Settings2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={provider.isEnabled ? 'success' : 'outline'}>
              {provider.isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <ProviderHealthBadge healthStatus={provider.healthStatus} />
          </div>
          <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <dt>Total requests</dt>
            <dd className="text-right text-foreground">{provider.totalRequests.toLocaleString()}</dd>
            <dt>Success rate</dt>
            <dd className="text-right text-foreground">{provider.successRate}%</dd>
            <dt>Avg response time</dt>
            <dd className="text-right text-foreground">
              {provider.avgResponseTimeMs ? `${Math.round(provider.avgResponseTimeMs)}ms` : '—'}
            </dd>
            <dt>Last connected</dt>
            <dd className="text-right text-foreground">{timeAgo(provider.lastConnectedAt)}</dd>
          </dl>
          {provider.lastTestError ? (
            <p className="truncate text-xs text-destructive" title={provider.lastTestError}>
              {provider.lastTestError}
            </p>
          ) : null}
        </CardContent>
        <div className="flex flex-wrap gap-2 border-t p-3">
          <Button size="sm" variant="outline" onClick={handleTest} disabled={test.isPending || !provider.hasApiKey}>
            <Wifi className="mr-1.5 h-3.5 w-3.5" />
            {test.isPending ? 'Testing…' : 'Test connection'}
          </Button>
          <Button
            size="sm"
            variant={provider.isEnabled ? 'outline' : 'default'}
            onClick={handleEnableToggle}
            disabled={enable.isPending || disable.isPending || (!provider.isEnabled && !provider.hasApiKey)}
          >
            {provider.isEnabled ? 'Disable' : 'Enable'}
          </Button>
          {provider.isEnabled && !provider.isDefault ? (
            <Button size="sm" variant="ghost" onClick={handleSetDefault} disabled={setDefault.isPending}>
              Set as default
            </Button>
          ) : null}
        </div>
      </Card>
      <ProviderConfigDialog provider={provider} open={configOpen} onOpenChange={setConfigOpen} />
    </>
  );
}
