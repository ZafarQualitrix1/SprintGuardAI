'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SprintSubNavProps {
  sprintId: string;
}

const TABS = [
  { label: 'Analysis', suffix: '' },
  { label: 'Requirements', suffix: 'requirements' },
  { label: 'Coverage', suffix: 'coverage' },
  { label: 'Test Generator', suffix: 'test-generator' },
  { label: 'Automation', suffix: 'automation' },
  { label: 'Manual Execution', suffix: 'executions' },
  { label: 'Automation Execution', suffix: 'automation-execution' },
  { label: 'Release Readiness', suffix: 'release-readiness' },
] as const;

// Route-driven tab bar: each "tab" is a distinct Next.js route (not client-side content
// switching), so this reuses the Radix Tabs visual language (components/ui/tabs.tsx) via plain
// styled <Link>s rather than TabsPrimitive itself, which assumes it owns the active-content state.
export function SprintSubNav({ sprintId }: SprintSubNavProps) {
  const pathname = usePathname();
  const base = `/dashboard/sprints/${sprintId}`;

  return (
    <nav className="mb-4 inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground">
      {TABS.map((tab) => {
        const href = tab.suffix ? `${base}/${tab.suffix}` : base;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.label}
            href={href as never}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all',
              isActive
                ? 'bg-background text-foreground shadow'
                : 'hover:bg-background/50 hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
