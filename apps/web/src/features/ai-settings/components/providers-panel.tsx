'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { useAiProviders } from '@/features/ai-settings/api';
import { ProviderCard } from './provider-card';

export function ProvidersPanel() {
  const { data: providers, isLoading, isError, refetch } = useAiProviders();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-56 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError || !providers) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Could not load AI providers"
        description="Something went wrong fetching provider configuration."
        action={
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {providers.map((provider) => (
        <ProviderCard key={provider.provider} provider={provider} />
      ))}
    </div>
  );
}
