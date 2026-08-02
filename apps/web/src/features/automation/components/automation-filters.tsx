'use client';

import { cn } from '@/lib/utils';

export const AUTOMATION_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'API', label: 'API Automation' },
  { key: 'UI', label: 'UI Automation' },
  { key: 'HIGH_PRIORITY', label: 'High Priority' },
  { key: 'REGRESSION', label: 'Regression' },
  { key: 'SMOKE', label: 'Smoke' },
] as const;

export type AutomationFilterKey = (typeof AUTOMATION_FILTERS)[number]['key'];

interface AutomationFiltersProps {
  value: AutomationFilterKey;
  onChange: (value: AutomationFilterKey) => void;
}

export function AutomationFilters({ value, onChange }: AutomationFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {AUTOMATION_FILTERS.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => onChange(filter.key)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            value === filter.key
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-background text-muted-foreground hover:bg-muted',
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
