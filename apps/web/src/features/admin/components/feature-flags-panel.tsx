'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useFeatureFlags, useRemoveFeatureFlagOverride, useSetFeatureFlag, useSetFeatureFlagOverride } from '@/features/admin/api';

export function FeatureFlagsPanel() {
  const { data: flags, isLoading } = useFeatureFlags();
  const setGlobal = useSetFeatureFlag();
  const setOverride = useSetFeatureFlagOverride();
  const removeOverride = useRemoveFeatureFlagOverride();
  const organizationId = useAuthStore((s) => s.user?.organizationId);
  const isPlatformAdmin = useAuthStore((s) => s.user?.permissions.includes('admin:platform'));

  if (isLoading || !flags) {
    return <Skeleton className="h-96 w-full" />;
  }

  const onError = (title: string) => (error: unknown) =>
    toast({ variant: 'destructive', title, description: error instanceof ApiError ? error.message : 'Something went wrong.' });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Feature Flags</CardTitle>
        <p className="text-xs text-muted-foreground">
          Enable or disable modules without a deployment. Global toggles require Super Admin; this
          organization&apos;s override requires only Feature Flag management.
        </p>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {flags.map((flag) => {
          const orgOverride = flag.overrides.find((o) => o.organizationId === organizationId);
          const effective = orgOverride ? Boolean(orgOverride.value) : Boolean(flag.defaultValue);
          return (
            <div key={flag.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{flag.key}</p>
                  {orgOverride ? <Badge variant="secondary">Org override</Badge> : null}
                  {flag.isBeta ? <Badge variant="outline">Beta</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">{flag.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {isPlatformAdmin ? (
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={Boolean(flag.defaultValue)}
                      onChange={(e) => setGlobal.mutate({ key: flag.key, isEnabled: e.target.checked }, { onError: onError('Could not update global flag') })}
                    />
                    Global
                  </label>
                ) : null}
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={effective}
                    onChange={(e) => setOverride.mutate({ key: flag.key, isEnabled: e.target.checked }, { onError: onError('Could not update override') })}
                  />
                  This org
                </label>
                {orgOverride ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                    onClick={() => removeOverride.mutate(flag.key, { onError: onError('Could not clear override') })}
                  >
                    Clear override
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
