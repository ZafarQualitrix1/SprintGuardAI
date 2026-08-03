'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useOrganizationSettings, useUpsertOrganizationSettings } from '@/features/organization/api';

interface WorkspaceFormValues {
  defaultProjectId: string;
  defaultSprintDurationDays: number;
  storyPointScale: string;
  autoSaveIntervalSeconds: number;
}

export function WorkspacePanel() {
  const { data: settings, isLoading } = useOrganizationSettings();
  const upsert = useUpsertOrganizationSettings();
  const { register, handleSubmit, reset } = useForm<WorkspaceFormValues>();

  useEffect(() => {
    if (settings) {
      reset({
        defaultProjectId: settings.defaultProjectId ?? '',
        defaultSprintDurationDays: settings.defaultSprintDurationDays ?? 14,
        storyPointScale: settings.storyPointScale.join(', '),
        autoSaveIntervalSeconds: settings.autoSaveIntervalSeconds ?? 30,
      });
    }
  }, [settings, reset]);

  const onSubmit = handleSubmit((values) => {
    const storyPointScale = values.storyPointScale
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => !Number.isNaN(v));

    upsert.mutate(
      {
        defaultProjectId: values.defaultProjectId || undefined,
        defaultSprintDurationDays: Number(values.defaultSprintDurationDays),
        storyPointScale,
        autoSaveIntervalSeconds: Number(values.autoSaveIntervalSeconds),
      },
      {
        onSuccess: () => toast({ title: 'Workspace configuration saved' }),
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not save workspace configuration',
            description: error instanceof ApiError ? error.message : 'Something went wrong.',
          }),
      },
    );
  });

  if (isLoading || !settings) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Workspace Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="defaultProjectId">Default project ID</Label>
            <Input id="defaultProjectId" placeholder="Optional" {...register('defaultProjectId')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultSprintDurationDays">Default sprint duration (days)</Label>
            <Input id="defaultSprintDurationDays" type="number" min={1} max={90} {...register('defaultSprintDurationDays')} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="storyPointScale">Story point scale (comma-separated)</Label>
            <Input id="storyPointScale" placeholder="1, 2, 3, 5, 8, 13" {...register('storyPointScale')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="autoSaveIntervalSeconds">Auto-save interval (seconds)</Label>
            <Input id="autoSaveIntervalSeconds" type="number" min={5} {...register('autoSaveIntervalSeconds')} />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => reset()}>
          Reset
        </Button>
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
