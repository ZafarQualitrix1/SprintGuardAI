'use client';

import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useOrganizationSettings, useUpsertOrganizationSettings } from '@/features/organization/api';

const TOGGLES = [
  { field: 'aiPromptApprovalRequired' as const, label: 'Prompt Approval Required' },
  { field: 'aiLoggingEnabled' as const, label: 'AI Logging' },
  { field: 'aiAuditTrailEnabled' as const, label: 'AI Audit Trail' },
];

export function AiConfigPanel() {
  const { data: settings, isLoading } = useOrganizationSettings();
  const upsert = useUpsertOrganizationSettings();

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

  if (isLoading || !settings) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">AI Organization Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {TOGGLES.map((row) => (
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
          <p className="pt-2 text-sm text-muted-foreground">
            Default AI provider/model, maximum daily requests, token limits, cost budget, and usage analytics are
            managed in{' '}
            <Link href="/dashboard/settings/ai" className="underline hover:text-foreground">
              AI Settings
            </Link>{' '}
            -- this section covers only the org-wide governance toggles above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
