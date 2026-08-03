'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';

function formatRole(roleKey: string) {
  return roleKey
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Page() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return (
      <div>
        <PageHeader title="Profile" description="Your account details and preferences." />
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Loading your profile…</CardContent>
        </Card>
      </div>
    );
  }

  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="space-y-4">
      <PageHeader title="Profile" description="Your account details and preferences." />

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{initials || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold leading-tight">{user.fullName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge variant="secondary" className="mt-2">
              {formatRole(user.roleKey)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Account details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Full name</p>
            <p className="text-sm">{user.fullName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Email</p>
            <p className="text-sm">{user.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Role</p>
            <p className="text-sm">{formatRole(user.roleKey)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">User ID</p>
            <p className="font-mono text-xs">{user.id}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Organization</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Organization name</p>
            <p className="text-sm">{user.organizationName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Organization ID</p>
            <p className="font-mono text-xs">{user.organizationId}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          {user.permissions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.permissions.map((permission) => (
                <Badge key={permission} variant="outline">
                  {permission.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No explicit permissions assigned.</p>
          )}
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground">
            Permissions are granted by your role ({formatRole(user.roleKey)}) and managed by your organization
            administrator under Organization Settings → Team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
