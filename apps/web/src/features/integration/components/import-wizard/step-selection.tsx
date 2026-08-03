'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useExternalSprintIssues } from '@/features/integration/api';
import type { SmartImportMode, SmartImportSelection } from '@sprintguard/shared';
import type { WizardSelection } from './import-wizard';

interface StepSelectionProps {
  selection: WizardSelection;
  onSelect: (patch: Partial<WizardSelection>) => void;
  onBack: () => void;
}

const MODE_OPTIONS: { value: SmartImportMode; label: string }[] = [
  { value: 'ENTIRE', label: 'Import Entire Sprint' },
  { value: 'SELECTED', label: 'Import Selected Issues' },
  { value: 'BY_EPIC', label: 'Import by Epic' },
  { value: 'BY_LABEL', label: 'Import by Label' },
  { value: 'BY_ASSIGNEE', label: 'Import by Assignee' },
];

const ISSUE_TYPE_FLAGS: { key: keyof SmartImportSelection; label: string }[] = [
  { key: 'includeEpics', label: 'Epics' },
  { key: 'includeUserStories', label: 'User Stories' },
  { key: 'includeTasks', label: 'Tasks' },
  { key: 'includeSubtasks', label: 'Subtasks' },
  { key: 'includeBugs', label: 'Bugs' },
];

const CONTENT_FLAGS: { key: keyof SmartImportSelection; label: string }[] = [
  { key: 'includeSprintDetails', label: 'Sprint Details' },
  { key: 'includeAcceptanceCriteria', label: 'Acceptance Criteria' },
  { key: 'includeStoryLinks', label: 'Story Links' },
  { key: 'includeLabels', label: 'Labels' },
  { key: 'includeComponents', label: 'Components' },
  { key: 'includeStoryPoints', label: 'Story Points' },
  { key: 'includeAssignees', label: 'Assignees' },
  { key: 'includeAttachments', label: 'Attachments' },
  { key: 'includeComments', label: 'Comments' },
];

function classify(issueType: string): 'epic' | 'subtask' | 'bug' | 'task' | 'story' {
  const normalized = issueType.toLowerCase();
  if (normalized.includes('epic')) return 'epic';
  if (normalized.includes('sub-task') || normalized.includes('subtask')) return 'subtask';
  if (normalized.includes('bug') || normalized.includes('defect')) return 'bug';
  if (normalized === 'task') return 'task';
  return 'story';
}

const DEFAULT_SELECTION: SmartImportSelection = {
  mode: 'ENTIRE',
  includeEpics: true,
  includeUserStories: true,
  includeTasks: true,
  includeSubtasks: true,
  includeBugs: true,
  includeSprintDetails: true,
  includeAcceptanceCriteria: true,
  includeStoryLinks: true,
  includeLabels: true,
  includeComponents: true,
  includeStoryPoints: true,
  includeAssignees: true,
  includeAttachments: true,
  includeComments: true,
};

// Wizard step 5 (of 6, inserted before "Import"): the multi-select "what to import" surface
// (§2). Fetches a cheap issue-summary listing once to power the SELECTED checklist and the
// distinct epic/label/assignee options for the BY_* modes -- the actual per-issue detail fetch
// (labels/components/acceptance criteria/comments/attachments/links) only happens server-side,
// for whichever issues this step's filters resolve to (see ImportSprintFromJiraHandler).
export function StepSelection({ selection, onSelect, onBack }: StepSelectionProps) {
  const { data: issues, isLoading } = useExternalSprintIssues(selection.connectionId, selection.sprintExternalId);
  const [smart, setSmart] = useState<SmartImportSelection>(selection.smartImport ?? DEFAULT_SELECTION);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(smart.selectedExternalIds ?? []));

  const typeFiltered = useMemo(
    () =>
      (issues ?? []).filter((issue) => {
        switch (classify(issue.issueType)) {
          case 'epic':
            return smart.includeEpics;
          case 'subtask':
            return smart.includeSubtasks;
          case 'bug':
            return smart.includeBugs;
          case 'task':
            return smart.includeTasks;
          default:
            return smart.includeUserStories;
        }
      }),
    [issues, smart],
  );

  const epicOptions = useMemo(
    () => Array.from(new Set((issues ?? []).map((i) => i.epicName).filter((v): v is string => Boolean(v)))),
    [issues],
  );
  const labelOptions = useMemo(
    () => Array.from(new Set((issues ?? []).flatMap((i) => i.labels))),
    [issues],
  );
  const assigneeOptions = useMemo(
    () => Array.from(new Set((issues ?? []).map((i) => i.assignee).filter((v): v is string => Boolean(v)))),
    [issues],
  );

  const selectedCount = useMemo(() => {
    switch (smart.mode) {
      case 'SELECTED':
        return typeFiltered.filter((i) => selectedKeys.has(i.externalId)).length;
      case 'BY_EPIC':
        return typeFiltered.filter((i) => i.epicName === smart.epicName).length;
      case 'BY_LABEL':
        return typeFiltered.filter((i) => i.labels.includes(smart.label ?? '')).length;
      case 'BY_ASSIGNEE':
        return typeFiltered.filter((i) => i.assignee === smart.assignee).length;
      default:
        return typeFiltered.length;
    }
  }, [smart, selectedKeys, typeFiltered]);

  const toggleIssueFlag = (key: keyof SmartImportSelection) =>
    setSmart((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleKey = (externalId: string) =>
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(externalId)) next.delete(externalId);
      else next.add(externalId);
      return next;
    });

  const onNext = () => {
    onSelect({ smartImport: { ...smart, selectedExternalIds: Array.from(selectedKeys) } });
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label>Import mode</Label>
          <Select value={smart.mode} onValueChange={(value) => setSmart((prev) => ({ ...prev, mode: value as SmartImportMode }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Issue types to include</Label>
          <div className="flex flex-wrap gap-4">
            {ISSUE_TYPE_FLAGS.map((flag) => (
              <label key={flag.key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(smart[flag.key])}
                  onCheckedChange={() => toggleIssueFlag(flag.key)}
                />
                {flag.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>What to import for each issue</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CONTENT_FLAGS.map((flag) => (
              <label key={flag.key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(smart[flag.key])}
                  onCheckedChange={() => toggleIssueFlag(flag.key)}
                />
                {flag.label}
              </label>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : smart.mode === 'BY_EPIC' ? (
          <div className="space-y-2">
            <Label>Epic</Label>
            <Select value={smart.epicName ?? ''} onValueChange={(value) => setSmart((prev) => ({ ...prev, epicName: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select an epic" />
              </SelectTrigger>
              <SelectContent>
                {epicOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : smart.mode === 'BY_LABEL' ? (
          <div className="space-y-2">
            <Label>Label</Label>
            <Select value={smart.label ?? ''} onValueChange={(value) => setSmart((prev) => ({ ...prev, label: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a label" />
              </SelectTrigger>
              <SelectContent>
                {labelOptions.map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : smart.mode === 'BY_ASSIGNEE' ? (
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select value={smart.assignee ?? ''} onValueChange={(value) => setSmart((prev) => ({ ...prev, assignee: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select an assignee" />
              </SelectTrigger>
              <SelectContent>
                {assigneeOptions.map((assignee) => (
                  <SelectItem key={assignee} value={assignee}>
                    {assignee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : smart.mode === 'SELECTED' ? (
          <div className="space-y-2">
            <Label>Issues ({typeFiltered.length})</Label>
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
              {typeFiltered.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">No issues match the selected issue types.</p>
              ) : (
                typeFiltered.map((issue) => (
                  <label key={issue.externalId} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                    <Checkbox checked={selectedKeys.has(issue.externalId)} onCheckedChange={() => toggleKey(issue.externalId)} />
                    <span className="truncate">
                      <span className="text-muted-foreground">{issue.externalId}</span> {issue.title}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        ) : null}

        <div className="rounded-md border bg-muted/40 p-3 text-sm font-medium">
          {selectedCount} item{selectedCount === 1 ? '' : 's'} selected for import
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={selectedCount === 0}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
