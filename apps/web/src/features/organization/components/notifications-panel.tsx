'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import {
  useOrganizationSettings,
  useSendTestNotification,
  useUpsertOrganizationSettings,
} from '@/features/organization/api';

const CHANNEL_TOGGLES = [
  { field: 'notifyEmail' as const, label: 'Email Notifications' },
  { field: 'notifySlack' as const, label: 'Slack Notifications' },
  { field: 'notifyTeams' as const, label: 'Teams Notifications' },
  { field: 'notifyBrowser' as const, label: 'Browser Notifications' },
];

const EVENT_TOGGLES = [
  { field: 'notifyRelease' as const, label: 'Release Notifications' },
  { field: 'notifySprintCompletion' as const, label: 'Sprint Completion Notifications' },
  { field: 'notifyBug' as const, label: 'Bug Notifications' },
  { field: 'notifyAiGeneration' as const, label: 'AI Generation Notifications' },
  { field: 'notifyBaApproval' as const, label: 'BA Approval Notifications' },
];

interface WebhookFormValues {
  slackWebhookUrl: string;
  teamsWebhookUrl: string;
}

export function NotificationsPanel() {
  const { data: settings, isLoading } = useOrganizationSettings();
  const upsert = useUpsertOrganizationSettings();
  const sendTest = useSendTestNotification();
  const { register, handleSubmit, reset } = useForm<WebhookFormValues>();

  useEffect(() => {
    if (settings) reset({ slackWebhookUrl: '', teamsWebhookUrl: '' });
  }, [settings, reset]);

  const toggle = (field: string, value: boolean) => {
    upsert.mutate(
      { [field]: value },
      {
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not save',
            description: error instanceof ApiError ? error.message : 'Something went wrong.',
          }),
      },
    );
  };

  const onSaveWebhooks = handleSubmit((values) => {
    upsert.mutate(
      {
        slackWebhookUrl: values.slackWebhookUrl || undefined,
        teamsWebhookUrl: values.teamsWebhookUrl || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: 'Webhook URLs saved' });
          reset({ slackWebhookUrl: '', teamsWebhookUrl: '' });
        },
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not save webhooks',
            description: error instanceof ApiError ? error.message : 'Something went wrong.',
          }),
      },
    );
  });

  const handleTest = (channel: 'slack' | 'teams') =>
    sendTest.mutate(channel, {
      onSuccess: (result) =>
        toast({
          title: result.delivered ? 'Test notification sent' : 'Delivery failed',
          description: result.error,
          variant: result.delivered ? 'default' : 'destructive',
        }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not send test notification',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });

  if (isLoading || !settings) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CHANNEL_TOGGLES.map((row) => (
            <div key={row.field} className="flex items-center gap-2">
              <Checkbox
                id={row.field}
                checked={settings[row.field]}
                onCheckedChange={(checked) => toggle(row.field, checked === true)}
              />
              <Label htmlFor={row.field} className="font-normal">
                {row.label}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Event Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {EVENT_TOGGLES.map((row) => (
            <div key={row.field} className="flex items-center gap-2">
              <Checkbox
                id={row.field}
                checked={settings[row.field]}
                onCheckedChange={(checked) => toggle(row.field, checked === true)}
              />
              <Label htmlFor={row.field} className="font-normal">
                {row.label}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Webhook URLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slackWebhookUrl">
                Slack webhook URL {settings.hasSlackWebhook ? <Badge variant="success" className="ml-2">Configured</Badge> : null}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="slackWebhookUrl"
                  placeholder={settings.hasSlackWebhook ? 'Leave blank to keep current' : 'https://hooks.slack.com/...'}
                  {...register('slackWebhookUrl')}
                />
                <Button type="button" variant="outline" onClick={() => handleTest('slack')} disabled={!settings.hasSlackWebhook || sendTest.isPending}>
                  Test
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamsWebhookUrl">
                Teams webhook URL {settings.hasTeamsWebhook ? <Badge variant="success" className="ml-2">Configured</Badge> : null}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="teamsWebhookUrl"
                  placeholder={settings.hasTeamsWebhook ? 'Leave blank to keep current' : 'https://outlook.office.com/webhook/...'}
                  {...register('teamsWebhookUrl')}
                />
                <Button type="button" variant="outline" onClick={() => handleTest('teams')} disabled={!settings.hasTeamsWebhook || sendTest.isPending}>
                  Test
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={onSaveWebhooks} disabled={upsert.isPending}>
              {upsert.isPending ? 'Saving…' : 'Save webhooks'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
