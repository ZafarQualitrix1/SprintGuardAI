'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { upsertAiProviderConfigSchema, type AiProviderSummary, type UpsertAiProviderConfigInput } from '@sprintguard/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useTestProviderConnection, useUpsertProviderConfig } from '@/features/ai-settings/api';

interface ProviderConfigDialogProps {
  provider: AiProviderSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProviderConfigDialog({ provider, open, onOpenChange }: ProviderConfigDialogProps) {
  const upsert = useUpsertProviderConfig();
  const test = useTestProviderConnection();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpsertAiProviderConfigInput>({
    resolver: zodResolver(upsertAiProviderConfigSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        apiKey: '',
        defaultModel: provider.defaultModel ?? '',
        temperature: 0.7,
        maxOutputTokens: undefined,
        timeoutMs: 30000,
        retryCount: 2,
      });
    }
  }, [open, provider, reset]);

  const onSubmit = handleSubmit((values) => {
    const { apiKey, ...rest } = values;
    upsert.mutate(
      { provider: provider.provider, input: { ...rest, apiKey: apiKey || undefined } },
      {
        onSuccess: () => {
          toast({ title: 'Provider configuration saved', description: provider.displayName });
          onOpenChange(false);
        },
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not save configuration',
            description: error instanceof ApiError ? error.message : 'Something went wrong.',
          }),
      },
    );
  });

  const onTestConnection = () =>
    test.mutate(provider.provider, {
      onSuccess: (result) =>
        toast({
          title: result.healthStatus === 'HEALTHY' ? 'Connection healthy' : 'Connection failed',
          description:
            result.error ?? `Responded in ${result.latencyMs}ms using ${result.model}.`,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure {provider.displayName}</DialogTitle>
          <DialogDescription>
            {provider.hasApiKey
              ? 'Leave the API key blank to keep the currently-stored key.'
              : 'Add an API key to enable this provider.'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={provider.hasApiKey ? 'Leave blank to keep current key' : 'Paste API key'}
              {...register('apiKey')}
            />
            {errors.apiKey ? <p className="text-xs text-destructive">{errors.apiKey.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultModel">Default model</Label>
            <Input id="defaultModel" placeholder="e.g. gemini-2.0-flash" {...register('defaultModel')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input id="temperature" type="number" step="0.1" min={0} max={2} {...register('temperature')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxOutputTokens">Max output tokens</Label>
              <Input id="maxOutputTokens" type="number" min={1} {...register('maxOutputTokens')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeoutMs">Timeout (ms)</Label>
              <Input id="timeoutMs" type="number" min={1000} max={120000} {...register('timeoutMs')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retryCount">Retry count</Label>
              <Input id="retryCount" type="number" min={0} max={5} {...register('retryCount')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fallbackProvider">Fallback provider</Label>
              <Input id="fallbackProvider" placeholder="e.g. anthropic" {...register('fallbackProvider')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fallbackModel">Fallback model</Label>
              <Input id="fallbackModel" placeholder="e.g. claude-sonnet-5" {...register('fallbackModel')} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={onTestConnection} disabled={test.isPending}>
              {test.isPending ? 'Testing…' : 'Test connection'}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? 'Saving…' : 'Save configuration'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
