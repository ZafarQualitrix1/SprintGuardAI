'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useOrganizationSettings, useUpsertOrganizationSettings } from '@/features/organization/api';

interface AutomationFormValues {
  automationFramework: string;
  automationBrowser: string;
  automationHeadless: boolean;
  automationParallelExecution: boolean;
  automationRetryCount: number;
  automationReportFormat: string;
  automationScreenshotPolicy: string;
  automationVideoPolicy: string;
  automationExecutionEnvironment: string;
}

export function AutomationPanel() {
  const { data: settings, isLoading } = useOrganizationSettings();
  const upsert = useUpsertOrganizationSettings();
  const { register, handleSubmit, watch, setValue, reset } = useForm<AutomationFormValues>();

  useEffect(() => {
    if (settings) {
      reset({
        automationFramework: settings.automationFramework ?? 'playwright',
        automationBrowser: settings.automationBrowser ?? 'chromium',
        automationHeadless: settings.automationHeadless,
        automationParallelExecution: settings.automationParallelExecution,
        automationRetryCount: settings.automationRetryCount ?? 1,
        automationReportFormat: settings.automationReportFormat ?? 'html',
        automationScreenshotPolicy: settings.automationScreenshotPolicy ?? 'on-failure',
        automationVideoPolicy: settings.automationVideoPolicy ?? 'off',
        automationExecutionEnvironment: settings.automationExecutionEnvironment ?? 'local',
      });
    }
  }, [settings, reset]);

  const onSubmit = handleSubmit((values) => {
    upsert.mutate(
      { ...values, automationRetryCount: Number(values.automationRetryCount) },
      {
        onSuccess: () => toast({ title: 'Automation defaults saved' }),
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not save automation defaults',
            description: error instanceof ApiError ? error.message : 'Something went wrong.',
          }),
      },
    );
  });

  if (isLoading || !settings) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Automation Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="automationFramework">Preferred automation framework</Label>
              <Input id="automationFramework" placeholder="playwright" {...register('automationFramework')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="automationBrowser">Default browser</Label>
              <Input id="automationBrowser" placeholder="chromium" {...register('automationBrowser')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="automationExecutionEnvironment">Default execution environment</Label>
              <Input id="automationExecutionEnvironment" placeholder="local" {...register('automationExecutionEnvironment')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="automationRetryCount">Retry count</Label>
              <Input id="automationRetryCount" type="number" min={0} max={5} {...register('automationRetryCount')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="automationReportFormat">Report format</Label>
              <Input id="automationReportFormat" placeholder="html" {...register('automationReportFormat')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="automationScreenshotPolicy">Screenshot policy</Label>
              <Input id="automationScreenshotPolicy" placeholder="on-failure" {...register('automationScreenshotPolicy')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="automationVideoPolicy">Video recording policy</Label>
              <Input id="automationVideoPolicy" placeholder="off" {...register('automationVideoPolicy')} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="automationHeadless"
              checked={watch('automationHeadless')}
              onCheckedChange={(checked) => setValue('automationHeadless', checked === true)}
            />
            <Label htmlFor="automationHeadless" className="font-normal">
              Headless mode
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="automationParallelExecution"
              checked={watch('automationParallelExecution')}
              onCheckedChange={(checked) => setValue('automationParallelExecution', checked === true)}
            />
            <Label htmlFor="automationParallelExecution" className="font-normal">
              Parallel execution
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            These are stored as organization-wide defaults. Enforcing them inside the automation generation/execution
            pipeline is a follow-up wiring task.
          </p>
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
