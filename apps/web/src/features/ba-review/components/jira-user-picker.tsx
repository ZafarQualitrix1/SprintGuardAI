'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useJiraUserSearch } from '@/features/ba-review/api';
import type { JiraUserMatch } from '@/features/ba-review/types';

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface JiraUserPickerProps {
  storyId: string;
  selected: JiraUserMatch[];
  onChange: (selected: JiraUserMatch[]) => void;
  multiple?: boolean;
  placeholder?: string;
}

// No Popover/Command primitive exists in this codebase yet -- a plain inline results list under
// the input (rather than a floating combobox) matches every other text-input-driven UI already in
// this module (admin-unlock-dialog.tsx, ba-assignment-field.tsx).
export function JiraUserPicker({ storyId, selected, onChange, multiple = false, placeholder }: JiraUserPickerProps) {
  const [rawQuery, setRawQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(rawQuery), 300);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  const { data: results, isLoading } = useJiraUserSearch(storyId, debouncedQuery);
  const selectedIds = new Set(selected.map((s) => s.accountId));
  const visibleResults = (results ?? []).filter((r) => !selectedIds.has(r.accountId));

  const onPick = (user: JiraUserMatch) => {
    onChange(multiple ? [...selected, user] : [user]);
    setRawQuery('');
    setDebouncedQuery('');
  };

  const onRemove = (accountId: string) => {
    onChange(selected.filter((s) => s.accountId !== accountId));
  };

  return (
    <div className="space-y-1.5">
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((user) => (
            <Badge key={user.accountId} variant="secondary" className="gap-1 pr-1">
              {user.displayName}
              <button
                type="button"
                onClick={() => onRemove(user.accountId)}
                className="rounded-full hover:bg-muted-foreground/20"
                aria-label={`Remove ${user.displayName}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      {multiple || selected.length === 0 ? (
        <div className="relative">
          <Input
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder={placeholder ?? 'Search Jira users by name or email…'}
          />
          {debouncedQuery.trim().length >= 2 ? (
            <div className="mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-sm">
              {isLoading ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
              ) : visibleResults.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">No matches.</p>
              ) : (
                visibleResults.map((user) => (
                  <button
                    key={user.accountId}
                    type="button"
                    onClick={() => onPick(user)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback className="text-[10px]">{initials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    {user.displayName}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
