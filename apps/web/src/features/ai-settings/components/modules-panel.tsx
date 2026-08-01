'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layers, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/layout/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useModuleAiConfigs } from '@/features/ai-settings/api';
import type { ModuleAiConfigSummary } from '@sprintguard/shared';
import { ModuleConfigDialog } from './module-config-dialog';

function ModuleRow({ module }: { module: ModuleAiConfigSummary }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{module.displayName}</p>
          {!module.integrated ? (
            <Badge variant="outline">Not yet integrated</Badge>
          ) : module.isEnabled ? (
            <Badge variant="success">Override active</Badge>
          ) : (
            <Badge variant="secondary">Using org default</Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {module.integrated
            ? `${module.provider ?? 'Org default'} · ${module.model ?? 'Registry default'}${
                module.activePromptVersion ? ` · prompt ${module.activePromptVersion}` : ''
              }`
            : 'No AI capability wired up for this module yet.'}
        </p>
      </div>
      {module.integrated ? (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Configure
        </Button>
      ) : null}
      {module.integrated ? <ModuleConfigDialog module={module} open={open} onOpenChange={setOpen} /> : null}
    </div>
  );
}

export function ModulesPanel() {
  const { data: modules, isLoading, isError } = useModuleAiConfigs();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError || !modules) {
    return <p className="text-sm text-destructive">Could not load module configuration.</p>;
  }

  if (modules.length === 0) {
    return <EmptyState icon={Layers} title="No modules found" description="Nothing to configure yet." />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="divide-y p-0">
          {modules.map((module) => (
            <ModuleRow key={module.capability} module={module} />
          ))}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Prompt versioning and rollback live in{' '}
        <Link href="/dashboard/settings/prompts" className="underline hover:text-foreground">
          Prompt Management
        </Link>
        .
      </p>
    </div>
  );
}
