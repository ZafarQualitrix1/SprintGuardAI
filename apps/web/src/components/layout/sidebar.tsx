'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navSections, brand } from './nav-items';
import { useAuthStore } from '@/stores/auth-store';

export function Sidebar() {
  const pathname = usePathname();
  const BrandIcon = brand.icon;
  const permissions = useAuthStore((s) => s.user?.permissions);

  return (
    <aside className="relative z-10 hidden w-64 shrink-0 border-r bg-card/85 backdrop-blur-md md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <BrandIcon className="h-5 w-5 text-primary" />
        <span className="font-semibold">{brand.name}</span>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {navSections.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.requiredPermission || permissions?.includes(item.requiredPermission),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title}>
              <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href as never}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
