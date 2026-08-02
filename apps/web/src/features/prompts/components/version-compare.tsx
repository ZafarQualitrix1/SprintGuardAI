'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { GitCompare } from 'lucide-react';
import { usePromptCompare, usePromptHistory } from '@/features/prompts/api';

interface VersionCompareProps {
  capability: string;
}

export function VersionCompare({ capability }: VersionCompareProps) {
  const { data: versions } = usePromptHistory(capability);
  const [a, setA] = useState<string | undefined>();
  const [b, setB] = useState<string | undefined>();
  const { data: comparison, isLoading } = usePromptCompare(capability, a, b);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={a} onValueChange={setA}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Version A" />
          </SelectTrigger>
          <SelectContent>
            {(versions ?? []).map((v) => (
              <SelectItem key={v.id} value={v.version}>
                {v.version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <GitCompare className="h-4 w-4 text-muted-foreground" />
        <Select value={b} onValueChange={setB}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Version B" />
          </SelectTrigger>
          <SelectContent>
            {(versions ?? []).map((v) => (
              <SelectItem key={v.id} value={v.version}>
                {v.version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!a || !b ? (
        <EmptyState icon={GitCompare} title="Pick two versions" description="Select a version A and version B above to see a side-by-side diff of the template." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : comparison ? (
        <pre className="max-h-[32rem] overflow-auto rounded-md border p-3 text-xs">
          {comparison.templateDiff.map((line, i) => (
            <div
              key={i}
              className={
                line.type === 'added'
                  ? 'bg-success/15 text-success'
                  : line.type === 'removed'
                    ? 'bg-destructive/15 text-destructive line-through'
                    : ''
              }
            >
              {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
              {line.text}
            </div>
          ))}
        </pre>
      ) : null}
    </div>
  );
}
