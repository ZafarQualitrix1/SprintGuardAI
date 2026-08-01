'use client';

import { Boxes } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/layout/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAiModels } from '@/features/ai-settings/api';

function costTierVariant(costTier: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (costTier === 'cheap') return 'success';
  if (costTier === 'standard') return 'secondary';
  return 'warning';
}

export function ModelsPanel() {
  const { data: models, isLoading, isError } = useAiModels();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError || !models) {
    return <p className="text-sm text-destructive">Could not load the model registry.</p>;
  }

  if (models.length === 0) {
    return (
      <EmptyState
        icon={Boxes}
        title="No models registered"
        description="Run `pnpm db:seed` to load the model registry catalog."
      />
    );
  }

  return (
    <Card>
      <CardContent className="divide-y p-0">
        {models.map((model) => (
          <div key={model.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{model.model}</p>
                <Badge variant="outline">{model.provider}</Badge>
                {!model.isActive ? <Badge variant="secondary">Inactive</Badge> : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{model.bestUseCase}</p>
            </div>
            <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
              <span>Speed: {model.speedLabel}</span>
              <Badge variant={costTierVariant(model.costTier)}>{model.costTier}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
