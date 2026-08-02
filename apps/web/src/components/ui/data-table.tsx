'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | null;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription: string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
}

// Small, dependency-free table primitive (no @tanstack/react-table) -- client-side sort over
// whatever rows are passed in (server already handles filtering/pagination for large lists).
// Shared by the Prompt Library and Execution History views.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  emptyTitle = 'No results',
  emptyDescription,
  onRowClick,
  selectable,
  selectedKeys,
  onSelectionChange,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortValue) return rows;
    const withValues = rows.map((row) => ({ row, value: column.sortValue!(row) }));
    withValues.sort((a, b) => {
      if (a.value == null) return 1;
      if (b.value == null) return -1;
      const cmp = a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return withValues.map((w) => w.row);
  }, [rows, sortKey, sortDir, columns]);

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
    }
  };

  const allSelected = selectable && rows.length > 0 && rows.every((r) => selectedKeys?.has(rowKey(r)));

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState icon={ArrowUpDown} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            {selectable ? (
              <th className="w-10 px-3 py-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => {
                    if (!onSelectionChange) return;
                    onSelectionChange(checked ? new Set(rows.map(rowKey)) : new Set());
                  }}
                />
              </th>
            ) : null}
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn('px-3 py-2 text-left text-xs font-medium text-muted-foreground', column.className)}
              >
                {column.sortValue ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {column.header}
                    {sortKey === column.key ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                className={cn('border-b last:border-0', onRowClick && 'cursor-pointer hover:bg-muted/30')}
                onClick={() => onRowClick?.(row)}
              >
                {selectable ? (
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedKeys?.has(key)}
                      onCheckedChange={(checked) => {
                        if (!onSelectionChange || !selectedKeys) return;
                        const next = new Set(selectedKeys);
                        if (checked) next.add(key);
                        else next.delete(key);
                        onSelectionChange(next);
                      }}
                    />
                  </td>
                ) : null}
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-3 py-2', column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
