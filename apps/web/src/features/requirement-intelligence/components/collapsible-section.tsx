'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

// Local primitive -- components/ui has no accordion, and this doesn't need one: just a
// button + chevron + conditional render, matching the card's existing "Open/Hide projects"
// toggle pattern used elsewhere in the app.
export function CollapsibleSection({ title, count, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/50"
      >
        <span className="flex items-center gap-2">
          {title}
          {count !== undefined ? <Badge variant="secondary">{count}</Badge> : null}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open ? <div className="space-y-2 border-t px-3 py-3 text-sm">{children}</div> : null}
    </div>
  );
}

export function StringList({ items, emptyLabel = 'None identified' }: { items: string[]; emptyLabel?: string }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="list-disc space-y-1 pl-4">
      {items.map((item, index) => (
        <li key={index} className="text-xs text-muted-foreground">
          {item}
        </li>
      ))}
    </ul>
  );
}
