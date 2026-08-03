'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { UpsertOrganizationSettingsInput } from '@sprintguard/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  useOrganizationBranding,
  useOrganizationSettings,
  useUploadLogo,
  useUpsertOrganizationSettings,
} from '@/features/organization/api';

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

type ProfileFormValues = Pick<
  UpsertOrganizationSettingsInput,
  | 'domain'
  | 'timezone'
  | 'defaultLanguage'
  | 'currency'
  | 'dateFormat'
  | 'businessHoursStart'
  | 'businessHoursEnd'
  | 'workingDays'
>;

export function ProfilePanel() {
  const { data: settings, isLoading } = useOrganizationSettings();
  const { data: branding } = useOrganizationBranding();
  const upsert = useUpsertOrganizationSettings();
  const uploadLogo = useUploadLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);

  const { register, handleSubmit, watch, setValue, reset } = useForm<ProfileFormValues>();

  useEffect(() => {
    if (settings) {
      reset({
        domain: settings.domain ?? '',
        timezone: settings.timezone,
        defaultLanguage: settings.defaultLanguage,
        currency: settings.currency,
        dateFormat: settings.dateFormat,
        businessHoursStart: settings.businessHoursStart ?? '',
        businessHoursEnd: settings.businessHoursEnd ?? '',
        workingDays: settings.workingDays as ProfileFormValues['workingDays'],
      });
    }
  }, [settings, reset]);

  const workingDays = watch('workingDays') ?? [];

  const toggleDay = (day: (typeof WEEKDAYS)[number]) => {
    const next = workingDays.includes(day) ? workingDays.filter((d) => d !== day) : [...workingDays, day];
    setValue('workingDays', next);
  };

  const onSubmit = handleSubmit((values) => {
    upsert.mutate(values, {
      onSuccess: () => toast({ title: 'Organization profile saved' }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not save profile',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadLogo.mutate(file, {
      onSuccess: () => toast({ title: 'Logo updated' }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not upload logo',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });
  };

  if (isLoading || !settings) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Organization Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {branding?.logoUrl ? <AvatarImage src={branding.logoUrl} alt="Organization logo" /> : null}
              <AvatarFallback>{user?.organizationName?.slice(0, 2).toUpperCase() ?? 'OR'}</AvatarFallback>
            </Avatar>
            <div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleFileChange} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadLogo.isPending}>
                {uploadLogo.isPending ? 'Uploading…' : 'Upload logo'}
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG, WEBP, or SVG. 2MB max.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organization name</Label>
              <Input value={user?.organizationName ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Organization ID</Label>
              <Input value={user?.organizationId ?? ''} disabled className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Organization domain</Label>
              <Input id="domain" placeholder="acme.com" {...register('domain')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Time zone</Label>
              <Input id="timezone" placeholder="UTC" {...register('timezone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultLanguage">Default language</Label>
              <Input id="defaultLanguage" placeholder="en" {...register('defaultLanguage')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" placeholder="USD" {...register('currency')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date format</Label>
              <Input id="dateFormat" placeholder="YYYY-MM-DD" {...register('dateFormat')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Working days</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <Button
                  key={day}
                  type="button"
                  size="sm"
                  variant={workingDays.includes(day) ? 'default' : 'outline'}
                  onClick={() => toggleDay(day)}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessHoursStart">Business hours start</Label>
              <Input id="businessHoursStart" type="time" {...register('businessHoursStart')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessHoursEnd">Business hours end</Label>
              <Input id="businessHoursEnd" type="time" {...register('businessHoursEnd')} />
            </div>
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
