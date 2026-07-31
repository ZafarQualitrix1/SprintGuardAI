'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  connectJiraSchema,
  updateConnectionSchema,
  type ConnectJiraInput,
  type IntegrationConnection,
  type UpdateConnectionInput,
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
import { useConnectJira, useTestConnection, useUpdateConnection, useVerifyJira } from '@/features/integration/api';

interface ConnectionFormDialogProps {
  mode: 'create' | 'update';
  connection?: IntegrationConnection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormValues = ConnectJiraInput | UpdateConnectionInput;

export function ConnectionFormDialog({ mode, connection, open, onOpenChange }: ConnectionFormDialogProps) {
  const connectJira = useConnectJira();
  const updateConnection = useUpdateConnection();
  const verify = useVerifyJira();
  const test = useTestConnection();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(mode === 'create' ? connectJiraSchema : updateConnectionSchema),
    defaultValues: { isDefault: false },
  });

  useEffect(() => {
    if (open) {
      reset(
        mode === 'update' && connection
          ? { name: connection.name, siteUrl: connection.siteUrl, email: connection.email ?? '', apiToken: '', isDefault: connection.isDefault }
          : { name: '', siteUrl: '', email: '', apiToken: '', isDefault: false },
      );
    }
  }, [open, mode, connection, reset]);

  const apiToken = watch('apiToken');
  const isSaving = connectJira.isPending || updateConnection.isPending;

  const onTestConnection = handleSubmit((values) => {
    if (mode === 'create' || values.apiToken) {
      verify.mutate(
        { siteUrl: values.siteUrl, email: values.email, apiToken: values.apiToken! },
        {
          onSuccess: (result) =>
            toast({
              title: result.healthy ? 'Connection looks good' : 'Could not connect',
              description: result.error,
              variant: result.healthy ? 'default' : 'destructive',
            }),
        },
      );
    } else if (connection) {
      // No new token typed -- test what's currently saved instead.
      test.mutate(connection.id, {
        onSuccess: (result) =>
          toast({
            title: result.healthStatus === 'HEALTHY' ? 'Connection looks good' : 'Could not connect',
            description: result.error,
            variant: result.healthStatus === 'HEALTHY' ? 'default' : 'destructive',
          }),
      });
    }
  });

  const onSubmit = handleSubmit((values) => {
    if (mode === 'create') {
      connectJira.mutate(values as ConnectJiraInput, {
        onSuccess: (created) => {
          toast({ title: 'Jira connected', description: created.name });
          onOpenChange(false);
        },
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not connect to Jira',
            description: error instanceof ApiError ? error.message : 'Something went wrong.',
          }),
      });
    } else if (connection) {
      const input = values as UpdateConnectionInput;
      updateConnection.mutate(
        { id: connection.id, input: { ...input, apiToken: input.apiToken || undefined } },
        {
          onSuccess: () => {
            toast({ title: 'Connection updated', description: connection.name });
            onOpenChange(false);
          },
          onError: (error) =>
            toast({
              variant: 'destructive',
              title: 'Could not save changes',
              description: error instanceof ApiError ? error.message : 'Something went wrong.',
            }),
        },
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Jira connection' : 'Update connection'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Connect a Jira workspace to import projects, boards, and sprints.'
              : 'Update this workspace’s details. Leave the API token blank to keep the current one.'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Workspace name</Label>
            <Input id="name" placeholder="Production Jira" {...register('name')} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteUrl">Jira URL</Label>
            <Input id="siteUrl" placeholder="https://acme.atlassian.net" {...register('siteUrl')} />
            {errors.siteUrl ? <p className="text-xs text-destructive">{errors.siteUrl.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiToken">API token</Label>
            <Input
              id="apiToken"
              type="password"
              placeholder={mode === 'update' ? 'Leave blank to keep current token' : undefined}
              {...register('apiToken')}
            />
            {errors.apiToken ? <p className="text-xs text-destructive">{errors.apiToken.message}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isDefault"
              checked={Boolean(watch('isDefault'))}
              onCheckedChange={(checked) => setValue('isDefault', checked === true)}
            />
            <Label htmlFor="isDefault" className="font-normal">
              Set as default workspace
            </Label>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onTestConnection}
              disabled={verify.isPending || test.isPending || (mode === 'update' && !apiToken && !connection)}
            >
              {verify.isPending || test.isPending ? 'Testing…' : 'Test connection'}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : mode === 'create' ? 'Save connection' : 'Save changes'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
