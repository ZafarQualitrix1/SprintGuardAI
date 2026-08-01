'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  upsertModuleAiConfigSchema,
  type ModuleAiConfigSummary,
  type UpsertModuleAiConfigInput,
} from '@sprintguard/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useUpsertModuleAiConfig } from '@/features/ai-settings/api';

interface ModuleConfigDialogProps {
  module: ModuleAiConfigSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModuleConfigDialog({ module, open, onOpenChange }: ModuleConfigDialogProps) {
  const upsert = useUpsertModuleAiConfig();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
  } = useForm<UpsertModuleAiConfigInput>({
    resolver: zodResolver(upsertModuleAiConfigSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        isEnabled: module.isEnabled,
        provider: module.provider ?? '',
        model: module.model ?? '',
        temperature: module.temperature ?? undefined,
        maxTokens: module.maxTokens ?? undefined,
        retryCount: module.retryCount ?? undefined,
        timeoutMs: module.timeoutMs ?? undefined,
        fallbackProvider: module.fallbackProvider ?? '',
        fallbackModel: module.fallbackModel ?? '',
      });
    }
  }, [open, module, reset]);

  const onSubmit = handleSubmit((values) => {
    upsert.mutate(
      { capability: module.capability, input: values },
      {
        onSuccess: () => {
          toast({ title: 'Module configuration saved', description: module.displayName });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure {module.displayName}</DialogTitle>
          <DialogDescription>
            Overrides the organization default provider/model for this capability only. Leave provider/model
            blank to inherit the org default.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isEnabled"
              checked={Boolean(watch('isEnabled'))}
              onCheckedChange={(checked) => setValue('isEnabled', checked === true)}
            />
            <Label htmlFor="isEnabled" className="font-normal">
              Use this override (unchecked = ignore and use the org default)
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider override</Label>
              <Input id="provider" placeholder="e.g. groq" {...register('provider')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model override</Label>
              <Input id="model" placeholder="e.g. llama-3.3-70b-versatile" {...register('model')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input id="temperature" type="number" step="0.1" min={0} max={2} {...register('temperature')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max tokens</Label>
              <Input id="maxTokens" type="number" min={1} {...register('maxTokens')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retryCount">Retry count</Label>
              <Input id="retryCount" type="number" min={0} max={5} {...register('retryCount')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeoutMs">Timeout (ms)</Label>
              <Input id="timeoutMs" type="number" min={1000} max={120000} {...register('timeoutMs')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fallbackProvider">Fallback provider</Label>
              <Input id="fallbackProvider" placeholder="e.g. anthropic" {...register('fallbackProvider')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fallbackModel">Fallback model</Label>
              <Input id="fallbackModel" placeholder="e.g. claude-sonnet-5" {...register('fallbackModel')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? 'Saving…' : 'Save configuration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
