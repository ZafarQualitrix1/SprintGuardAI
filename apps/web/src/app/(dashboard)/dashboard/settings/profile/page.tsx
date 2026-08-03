'use client';

import { useRef } from 'react';
import { Camera } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { formatRoleKey } from '@/lib/format';
import { validateImageFile } from '@/lib/file-upload';
import { useAuthStore } from '@/stores/auth-store';
import { useUploadAvatar } from '@/features/auth/api';

export default function Page() {
  const user = useAuthStore((state) => state.user);
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validationError = validateImageFile(file, {
      maxBytes: 2 * 1024 * 1024,
      allowedTypes: ['image/png', 'image/jpeg', 'image/webp'],
      label: 'Profile photos',
    });
    if (validationError) {
      toast({ variant: 'destructive', ...validationError });
      return;
    }

    uploadAvatar.mutate(file, {
      onSuccess: () => toast({ title: 'Profile photo updated' }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not update your photo',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Profile" description="Your account details and preferences." />

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="relative">
            <Avatar className="h-16 w-16">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.fullName} /> : null}
              <AvatarFallback className="text-lg">{initials || 'U'}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
              title="Change photo"
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-foreground disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">{user.fullName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge variant="secondary" className="mt-2">
              {formatRoleKey(user.roleKey)}
            </Badge>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAvatar.isPending}
          >
            {uploadAvatar.isPending ? 'Uploading…' : 'Change photo'}
          </Button>
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
            <p className="text-sm">{formatRoleKey(user.roleKey)}</p>
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
            Permissions are granted by your role ({formatRoleKey(user.roleKey)}) and managed by your organization
            administrator under Organization Settings → Team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
