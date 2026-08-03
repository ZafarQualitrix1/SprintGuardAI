'use client';

import { useRouter } from 'next/navigation';
import { ExternalLink, CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRequirements } from '@/features/requirement-intelligence/api';
import { useTestScenarios } from '@/features/test-intelligence/api';
import { useStoryCoverage } from '@/features/coverage/api';
import { useExecutionsByStory } from '@/features/execution/api';
import { useSelectedStoryStore } from '@/stores/selected-story-store';
import type { Story } from '@sprintguard/shared';

interface StoryProgressRowProps {
  sprintId: string;
  story: Pick<Story, 'id' | 'externalId' | 'title' | 'status' | 'storyPoints' | 'priority' | 'assignee'>;
  jiraSiteUrl: string | null;
}

const STAGES = [
  { key: 'requirements', label: 'Requirement', suffix: 'requirements' },
  { key: 'testGen', label: 'Test Gen', suffix: 'test-generator' },
  { key: 'coverage', label: 'Coverage', suffix: 'coverage' },
  { key: 'execution', label: 'Execution', suffix: 'executions' },
] as const;

// Bug 1: user-story-driven workflow. Selecting a story (row click, or the "Open" button) stores it
// globally and navigates to Requirement Intelligence; clicking a still-pending stage badge instead
// selects the story AND jumps straight to that stage, matching "clicking the pending status should
// navigate directly to that module while keeping the selected user story loaded."
export function StoryProgressRow({ sprintId, story, jiraSiteUrl }: StoryProgressRowProps) {
  const router = useRouter();
  const selectStory = useSelectedStoryStore((s) => s.selectStory);

  const { data: requirements } = useRequirements(story.id);
  const { data: scenarios } = useTestScenarios(story.id);
  const { data: coverage } = useStoryCoverage(story.id);
  const { data: executions } = useExecutionsByStory(story.id);

  const stageDone: Record<(typeof STAGES)[number]['key'], boolean> = {
    requirements: Boolean(requirements && requirements.length > 0),
    testGen: Boolean(scenarios && scenarios.length > 0),
    coverage: Boolean(coverage && coverage.summary.totalRequirements > 0),
    execution: Boolean(executions && executions.length > 0),
  };

  const goToStage = (suffix: string) => {
    selectStory(sprintId, story.id);
    router.push(`/dashboard/sprints/${sprintId}/${suffix}` as never);
  };

  const jiraUrl = jiraSiteUrl && story.externalId ? `${jiraSiteUrl.replace(/\/$/, '')}/browse/${story.externalId}` : null;

  return (
    <tr className="cursor-pointer hover:bg-accent/40" onClick={() => goToStage('requirements')}>
      <td className="py-2 pr-4">
        <div className="flex items-center gap-2">
          <div>
            <div className="font-medium">{story.title}</div>
            {story.externalId ? (
              <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                {story.externalId}
                {jiraUrl ? (
                  <a
                    href={jiraUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center text-primary hover:underline"
                    aria-label={`Open ${story.externalId} in Jira`}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </td>
      <td className="py-2 pr-4">
        <Badge variant="secondary">{story.status}</Badge>
      </td>
      <td className="py-2 pr-4">{story.storyPoints ?? '—'}</td>
      <td className="py-2 pr-4">{story.priority ?? '—'}</td>
      <td className="py-2 pr-4">{story.assignee ?? 'Unassigned'}</td>
      <td className="py-2">
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((stage) => {
            const done = stageDone[stage.key];
            return (
              <button
                key={stage.key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToStage(stage.suffix);
                }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                  done
                    ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-muted-foreground/30 text-muted-foreground hover:bg-accent',
                )}
                title={done ? `${stage.label} complete` : `${stage.label} pending — click to start`}
              >
                {done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                {stage.label}
              </button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}
