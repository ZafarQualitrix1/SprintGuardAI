'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useRoles, useSetRolePermission } from '@/features/admin/api';

export function RolesPermissionsPanel() {
  const { data, isLoading } = useRoles();
  const setPermission = useSetRolePermission();

  if (isLoading || !data) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Roles & Permissions</CardTitle>
        <p className="text-xs text-muted-foreground">
          Covers the permission catalog SprintGuard AI actually enforces today. Owner always retains full access.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky left-0 bg-muted/40 px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                Permission
              </th>
              {data.roles.map((role) => (
                <th key={role.id} className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.permissions.map((permission) => (
              <tr key={permission.key} className="border-b last:border-0">
                <td className="sticky left-0 bg-background px-3 py-2">
                  <p className="font-mono text-xs">{permission.key}</p>
                  <p className="text-xs text-muted-foreground">{permission.description}</p>
                </td>
                {data.roles.map((role) => {
                  const granted = role.permissions.includes(permission.key);
                  const locked = role.key === 'OWNER';
                  return (
                    <td key={role.id} className="px-3 py-2 text-center">
                      <Checkbox
                        checked={granted}
                        disabled={locked || setPermission.isPending}
                        onCheckedChange={(checked) =>
                          setPermission.mutate(
                            { roleKey: role.key, permissionKey: permission.key, granted: checked === true },
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
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
