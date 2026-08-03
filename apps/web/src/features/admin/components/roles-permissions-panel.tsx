'use client';

import { useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useRoles, useSetRolePermission } from '@/features/admin/api';
import type { PermissionCatalogEntry } from '@sprintguard/shared';

// Permission keys are "<category>:<action>" (e.g. "test:approve") -- group by category and give
// each one a plain-language label instead of showing the raw key as the primary heading, so the
// page reads as "what can this role do" instead of a wall of colon-separated identifiers.
const CATEGORY_LABELS: Record<string, string> = {
  sprint: 'Sprints',
  requirement: 'Requirements',
  test: 'Test Cases & BA Review',
  coverage: 'Coverage',
  execution: 'Execution',
  automation: 'Automation',
  release: 'Release',
  prompt: 'Prompt Management',
  'ai-settings': 'AI Settings',
  org: 'Organization',
  integration: 'Integrations',
  admin: 'Platform Admin',
};

function categoryLabel(permissionKey: string): string {
  const category = permissionKey.split(':')[0] ?? permissionKey;
  return CATEGORY_LABELS[category] ?? category;
}

function groupByCategory(permissions: PermissionCatalogEntry[]): [string, PermissionCatalogEntry[]][] {
  const groups = new Map<string, PermissionCatalogEntry[]>();
  for (const permission of permissions) {
    const label = categoryLabel(permission.key);
    groups.set(label, [...(groups.get(label) ?? []), permission]);
  }
  return [...groups.entries()];
}

export function RolesPermissionsPanel() {
  const { data, isLoading } = useRoles();
  const setPermission = useSetRolePermission();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const groupedPermissions = useMemo(
    () => (data ? groupByCategory(data.permissions) : []),
    [data],
  );

  if (isLoading || !data) {
    return <Skeleton className="h-96 w-full" />;
  }

  const selectedRole = data.roles.find((r) => r.id === selectedRoleId) ?? data.roles[0];
  const isOwner = selectedRole?.key === 'OWNER';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Roles & Permissions</CardTitle>
        <p className="text-xs text-muted-foreground">
          Pick a role to see and edit exactly what it can do. Owner always has full access.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {data.roles.map((role) => {
            const active = role.id === selectedRole?.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted',
                )}
              >
                {role.name}
                <span className={cn('ml-1.5 opacity-70', active ? 'text-primary-foreground' : 'text-muted-foreground')}>
                  {role.key === 'OWNER' ? data.permissions.length : role.permissions.length}/{data.permissions.length}
                </span>
              </button>
            );
          })}
        </div>

        {isOwner ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Owners always have every permission. This role can&apos;t be edited.
          </div>
        ) : (
          <div className="space-y-5">
            {groupedPermissions.map(([category, permissions]) => (
              <div key={category}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {permissions.map((permission) => {
                    const granted = selectedRole?.permissions.includes(permission.key) ?? false;
                    return (
                      <label
                        key={permission.key}
                        className="flex items-start gap-2.5 rounded-md border p-2.5 text-sm hover:bg-muted/40"
                      >
                        <Checkbox
                          className="mt-0.5"
                          checked={granted}
                          disabled={setPermission.isPending}
                          onCheckedChange={(checked) =>
                            selectedRole &&
                            setPermission.mutate(
                              { roleKey: selectedRole.key, permissionKey: permission.key, granted: checked === true },
                              {
                                onError: (error) =>
                                  toast({
                                    variant: 'destructive',
                                    title: 'Could not update permission',
                                    description: error instanceof ApiError ? error.message : 'Something went wrong.',
                                  }),
                              },
                            )
                          }
                        />
                        <span>{permission.description}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 border-t pt-3">
          <span className="text-xs text-muted-foreground">All roles:</span>
          {data.roles.map((role) => (
            <Badge key={role.id} variant="outline" className="text-xs">
              {role.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
