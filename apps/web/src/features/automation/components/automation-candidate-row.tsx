'use client';

import { Bookmark, Download, Eye, RefreshCw, Sparkles } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { automationApi } from '@/features/automation/api';
import { useGenerateAutomation, useSaveAutomation } from '@/features/automation/api';
import { downloadFilesAsZip, slugify } from '@/features/automation/lib/download-framework';
import type { AutomationCandidate } from '@sprintguard/shared';

const priorityVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'warning',
  CRITICAL: 'destructive',
};

const statusVariant: Record<string, 'default' | 'secondary' | 'warning'> = {
  GENERATED: 'secondary',
  SAVED: 'default',
  COMMITTED: 'warning',
};

interface AutomationCandidateRowProps {
  sprintId: string;
  candidate: AutomationCandidate;
  selected: boolean;
  onToggleSelected: (testCaseId: string) => void;
  onPreview: (automationGenerationId: string) => void;
}

export function AutomationCandidateRow({
  sprintId,
  candidate,
  selected,
  onToggleSelected,
  onPreview,
}: AutomationCandidateRowProps) {
  const generate = useGenerateAutomation(sprintId);
  const save = useSaveAutomation(sprintId);

  const relevantGeneration = candidate.automationType === 'API' ? candidate.latestApi : candidate.latestUi;

  const onGenerate = () =>
    generate.mutate(
      { testCaseId: candidate.testCaseId, automationType: candidate.automationType as 'API' | 'UI' },
      {
        onSuccess: () =>
          toast({ title: relevantGeneration ? 'Automation regenerated' : 'Automation generated', description: candidate.testCaseTitle }),
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not generate automation',
            description: error instanceof ApiError ? error.message : undefined,
          }),
      },
    );

  const onSave = () => {
    if (!relevantGeneration) return;
    save.mutate(relevantGeneration.id, {
      onSuccess: () => toast({ title: 'Automation saved', description: candidate.testCaseTitle }),
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not save automation',
          description: error instanceof ApiError ? error.message : undefined,
        }),
    });
  };

  const onDownload = async () => {
    if (!relevantGeneration) return;
    try {
      const detail = await automationApi.detail(relevantGeneration.id);
      await downloadFilesAsZip(`${slugify(candidate.testCaseTitle)}-automation.zip`, [
        { folder: slugify(candidate.testCaseTitle), files: detail.files },
      ]);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not download framework',
        description: error instanceof ApiError ? error.message : undefined,
      });
    }
  };

  return (
    <div className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0">
      <Checkbox checked={selected} onCheckedChange={() => onToggleSelected(candidate.testCaseId)} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{candidate.testCaseTitle}</p>
        <p className="truncate text-xs text-muted-foreground">{candidate.storyTitle}</p>
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        <Badge variant="secondary">{candidate.testType}</Badge>
        <Badge variant={priorityVariant[candidate.priority] ?? 'default'}>{candidate.priority}</Badge>
        <Badge variant="outline">{candidate.automationType}</Badge>
        {relevantGeneration ? (
          <Badge variant={statusVariant[relevantGeneration.status] ?? 'secondary'}>
            {relevantGeneration.status} · v{relevantGeneration.version}
            {relevantGeneration.automationReadinessScore !== null
              ? ` · ${relevantGeneration.automationReadinessScore}%`
              : ''}
          </Badge>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="outline" disabled={generate.isPending} onClick={onGenerate}>
          {relevantGeneration ? (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          )}
          {generate.isPending ? 'Working…' : relevantGeneration ? 'Regenerate' : 'Generate'}
        </Button>
        {relevantGeneration ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => onPreview(relevantGeneration.id)} title="Preview code">
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onDownload} title="Download framework">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={save.isPending || relevantGeneration.status !== 'GENERATED'}
              onClick={onSave}
              title="Save automation"
            >
              <Bookmark className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
