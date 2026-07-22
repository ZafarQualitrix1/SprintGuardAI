'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { connectJiraSchema, type ConnectJiraInput } from '@sprintguard/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConnectJira } from '@/features/integration/api';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

export function ConnectJiraCard() {
  const connectJira = useConnectJira();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConnectJiraInput>({ resolver: zodResolver(connectJiraSchema) });

  const onSubmit = (values: ConnectJiraInput) =>
    connectJira.mutate(values, {
      onSuccess: (connection) => toast({ title: 'Jira connected', description: connection.name }),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Jira</CardTitle>
        <CardDescription>
          Paste your Jira site URL and an API token to start importing sprints. Create a token at{' '}
          <span className="font-mono text-xs">id.atlassian.com/manage-profile/security/api-tokens</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Connection name</Label>
              <Input id="name" placeholder="Acme Jira" {...register('name')} />
              {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteUrl">Jira site URL</Label>
              <Input id="siteUrl" placeholder="https://acme.atlassian.net" {...register('siteUrl')} />
              {errors.siteUrl ? <p className="text-xs text-destructive">{errors.siteUrl.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Atlassian account email</Label>
              <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
              {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiToken">API token</Label>
              <Input id="apiToken" type="password" {...register('apiToken')} />
              {errors.apiToken ? (
                <p className="text-xs text-destructive">{errors.apiToken.message}</p>
              ) : null}
            </div>
          </div>
          {connectJira.isError ? (
            <p className="text-sm text-destructive">
              {connectJira.error instanceof ApiError
                ? connectJira.error.message
                : 'Could not connect to Jira.'}
            </p>
          ) : null}
          <Button type="submit" disabled={connectJira.isPending}>
            {connectJira.isPending ? 'Connecting…' : 'Connect Jira'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
