'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, User } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/features/auth/api';
import { toast } from '@/hooks/use-toast';
import { formatRoleKey } from '@/lib/format';

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  const initial = user?.fullName?.charAt(0).toUpperCase() ?? 'U';

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast({ title: 'Signed out' });
        router.push('/login');
      },
    });
  };

  return (
    <header className="relative z-10 flex h-14 items-center justify-between border-b bg-background/85 backdrop-blur-md px-4">
      <div className="flex items-center gap-4">
        {user ? (
          <span className="text-sm font-medium text-muted-foreground">{user.organizationName}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {user ? (
              <span className="hidden text-right leading-tight sm:block">
                <span className="block text-sm font-medium">{user.fullName}</span>
                <span className="block text-xs text-muted-foreground">{formatRoleKey(user.roleKey)}</span>
              </span>
            ) : null}
            <Avatar>
              {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.fullName} /> : null}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="truncate text-sm font-medium">{user?.fullName}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
              {user ? (
                <Badge variant="secondary" className="mt-1.5">
                  {formatRoleKey(user.roleKey)}
                </Badge>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={'/dashboard/settings/profile' as never}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={'/dashboard/settings/organization' as never}>
                <Settings className="mr-2 h-4 w-4" />
                Organization Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
