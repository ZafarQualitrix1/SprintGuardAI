'use client';

import { useState } from 'react';
import type { AdminUserSummary } from '@sprintguard/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  useActivateUser,
  useAdminUsers,
  useDeleteUser,
  useForceLogoutUser,
  useResetUserPassword,
  useSuspendUser,
} from '@/features/admin/api';
import { ChangeRoleDialog } from './change-role-dialog';

export function UsersPanel() {
  const [search, setSearch] = useState('');
  const { data: users, isLoading } = useAdminUsers({ search: search || undefined });
  const suspend = useSuspendUser();
  const activate = useActivateUser();
  const resetPassword = useResetUserPassword();
  const forceLogout = useForceLogoutUser();
  const deleteUser = useDeleteUser();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [roleTarget, setRoleTarget] = useState<AdminUserSummary | null>(null);

  const onError = (title: string) => (error: unknown) =>
    toast({ variant: 'destructive', title, description: error instanceof ApiError ? error.message : 'Something went wrong.' });

  const columns: DataTableColumn<AdminUserSummary>[] = [
    { key: 'fullName', header: 'Name', render: (u) => u.fullName, sortValue: (u) => u.fullName },
    { key: 'email', header: 'Email', render: (u) => u.email, sortValue: (u) => u.email },
    { key: 'role', header: 'Role', render: (u) => u.roleName },
    { key: 'status', header: 'Status', render: (u) => <Badge variant={u.isActive ? 'success' : 'outline'}>{u.isActive ? 'Active' : 'Suspended'}</Badge> },
    {
      key: 'lastLoginAt',
      header: 'Last login',
      render: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'),
      sortValue: (u) => u.lastLoginAt ?? '',
    },
    {
      key: 'actions',
      header: '',
      render: (u) =>
        u.id === currentUserId ? null : (
          // Row click opens the Change Role dialog -- stop propagation here so opening this menu,
          // or acting on any item inside it, doesn't also trigger that.
          <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="User actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setRoleTarget(u)}>Change role</DropdownMenuItem>
              <DropdownMenuSeparator />
              {u.isActive ? (
                <DropdownMenuItem onSelect={() => suspend.mutate(u.id, { onError: onError('Could not suspend user') })}>
                  Suspend
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => activate.mutate(u.id, { onError: onError('Could not activate user') })}>
                  Activate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={() =>
                  resetPassword.mutate(u.id, {
                    onSuccess: (result) =>
                      toast({
                        title: 'Temporary password generated',
                        description: `${result.temporaryPassword} -- share this with the user; it will not be shown again.`,
                      }),
                    onError: onError('Could not reset password'),
                  })
                }
              >
                Reset password
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  forceLogout.mutate(u.id, {
                    onSuccess: () => toast({ title: 'All sessions revoked', description: u.email }),
                    onError: onError('Could not force logout'),
                  })
                }
              >
                Force logout
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => {
                  if (confirm(`Delete ${u.fullName}? This cannot be undone.`)) {
                    deleteUser.mutate(u.id, { onError: onError('Could not delete user') });
                  }
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        ),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">User Administration</CardTitle>
        <Input placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-56" />
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          rows={users ?? []}
          rowKey={(u) => u.id}
          isLoading={isLoading}
          emptyDescription="No users found for these filters."
          onRowClick={(u) => {
            if (u.id !== currentUserId) setRoleTarget(u);
          }}
        />
      </CardContent>
      <ChangeRoleDialog user={roleTarget} open={roleTarget !== null} onOpenChange={(open) => !open && setRoleTarget(null)} />
    </Card>
  );
}
