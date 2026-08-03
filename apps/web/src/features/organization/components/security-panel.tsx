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

interface SecurityFormValues {
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  allowedDomains: string;
  allowedIpRanges: string;
}

export function SecurityPanel() {
  const { data: settings, isLoading } = useOrganizationSettings();
  const upsert = useUpsertOrganizationSettings();
  const { register, handleSubmit, watch, setValue, reset } = useForm<SecurityFormValues>();

  useEffect(() => {
    if (settings) {
      reset({
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes ?? 60,
        passwordMinLength: settings.passwordMinLength ?? 10,
        passwordRequireUppercase: settings.passwordRequireUppercase,
        passwordRequireNumber: settings.passwordRequireNumber,
        passwordRequireSymbol: settings.passwordRequireSymbol,
        allowedDomains: settings.allowedDomains.join(', '),
        allowedIpRanges: settings.allowedIpRanges.join(', '),
      });
    }
  }, [settings, reset]);

  const onSubmit = handleSubmit((values) => {
    upsert.mutate(
      {
        sessionTimeoutMinutes: Number(values.sessionTimeoutMinutes),
        passwordMinLength: Number(values.passwordMinLength),
        passwordRequireUppercase: values.passwordRequireUppercase,
        passwordRequireNumber: values.passwordRequireNumber,
        passwordRequireSymbol: values.passwordRequireSymbol,
        allowedDomains: values.allowedDomains.split(',').map((v) => v.trim()).filter(Boolean),
        allowedIpRanges: values.allowedIpRanges.split(',').map((v) => v.trim()).filter(Boolean),
      },
      {
        onSuccess: () => toast({ title: 'Security settings saved' }),
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not save security settings',
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
          <CardTitle className="text-sm font-medium">Session & Password Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeoutMinutes">Session timeout (minutes)</Label>
              <Input id="sessionTimeoutMinutes" type="number" min={5} max={1440} {...register('sessionTimeoutMinutes')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordMinLength">Minimum password length</Label>
              <Input id="passwordMinLength" type="number" min={6} max={64} {...register('passwordMinLength')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Password requirements</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="passwordRequireUppercase"
                checked={watch('passwordRequireUppercase')}
                onCheckedChange={(checked) => setValue('passwordRequireUppercase', checked === true)}
              />
              <Label htmlFor="passwordRequireUppercase" className="font-normal">
                Require uppercase letter
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="passwordRequireNumber"
                checked={watch('passwordRequireNumber')}
                onCheckedChange={(checked) => setValue('passwordRequireNumber', checked === true)}
              />
              <Label htmlFor="passwordRequireNumber" className="font-normal">
                Require number
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="passwordRequireSymbol"
                checked={watch('passwordRequireSymbol')}
                onCheckedChange={(checked) => setValue('passwordRequireSymbol', checked === true)}
              />
              <Label htmlFor="passwordRequireSymbol" className="font-normal">
                Require symbol
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Access Restrictions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="allowedDomains">Allowed email domains (comma-separated)</Label>
            <Input id="allowedDomains" placeholder="acme.com, acme.io" {...register('allowedDomains')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="allowedIpRanges">Allowed IP ranges (comma-separated)</Label>
            <Input id="allowedIpRanges" placeholder="203.0.113.0/24" {...register('allowedIpRanges')} />
          </div>
          <p className="text-xs text-muted-foreground">
            Stored as organization policy. Domain restrictions are enforced on new invitations; IP-range enforcement
            at the network edge is a follow-up.
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
