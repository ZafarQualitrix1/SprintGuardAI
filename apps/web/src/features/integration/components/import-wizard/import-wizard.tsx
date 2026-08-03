'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportWizardStep } from '@/features/integration/types';
import type { SmartImportSelection } from '@sprintguard/shared';
import { StepWorkspace } from './step-workspace';
import { StepProject } from './step-project';
import { StepBoard } from './step-board';
import { StepSprint } from './step-sprint';
import { StepSelection } from './step-selection';
import { StepImport } from './step-import';

const STEPS: { id: ImportWizardStep; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'project', label: 'Project' },
  { id: 'board', label: 'Board' },
  { id: 'sprint', label: 'Sprint' },
  { id: 'selection', label: 'Selection' },
  { id: 'import', label: 'Import' },
];

export interface WizardSelection {
  connectionId?: string;
  connectionName?: string;
  jiraProjectKey?: string;
  jiraProjectName?: string;
  boardId?: string;
  boardName?: string;
  sprintExternalId?: string;
  sprintName?: string;
  smartImport?: SmartImportSelection;
}

export function ImportWizard() {
  const [step, setStep] = useState<ImportWizardStep>('workspace');
  const [selection, setSelection] = useState<WizardSelection>({});

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const goTo = (id: ImportWizardStep) => setStep(id);
  const next = () => {
    const idx = STEPS.findIndex((s) => s.id === step);
    const nextStep = STEPS[idx + 1];
    if (nextStep) setStep(nextStep.id);
  };
  const back = () => {
    const idx = STEPS.findIndex((s) => s.id === step);
    const prevStep = STEPS[idx - 1];
    if (prevStep) setStep(prevStep.id);
  };

  const patchSelection = (patch: Partial<WizardSelection>) => setSelection((prev) => ({ ...prev, ...patch }));

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {STEPS.map((s, idx) => {
          const isDone = idx < stepIndex;
          const isCurrent = idx === stepIndex;
          const isReachable = idx <= stepIndex;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => isReachable && goTo(s.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  isCurrent && 'bg-primary text-primary-foreground',
                  !isCurrent && isDone && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  !isCurrent && !isDone && 'bg-muted text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border text-[10px]',
                    isCurrent && 'border-primary-foreground',
                    isDone && 'border-transparent bg-secondary-foreground/20',
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : idx + 1}
                </span>
                {s.label}
              </button>
              {idx < STEPS.length - 1 ? <span className="h-px w-4 bg-border" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>

      {step === 'workspace' ? (
        <StepWorkspace
          selection={selection}
          onSelect={(patch) => {
            patchSelection(patch);
            next();
          }}
        />
      ) : null}
      {step === 'project' ? (
        <StepProject
          selection={selection}
          onSelect={(patch) => {
            patchSelection(patch);
            next();
          }}
          onBack={back}
        />
      ) : null}
      {step === 'board' ? (
        <StepBoard
          selection={selection}
          onSelect={(patch) => {
            patchSelection(patch);
            next();
          }}
          onBack={back}
        />
      ) : null}
      {step === 'sprint' ? (
        <StepSprint
          selection={selection}
          onSelect={(patch) => {
            patchSelection(patch);
            next();
          }}
          onBack={back}
        />
      ) : null}
      {step === 'selection' ? (
        <StepSelection
          selection={selection}
          onSelect={(patch) => {
            patchSelection(patch);
            next();
          }}
          onBack={back}
        />
      ) : null}
      {step === 'import' ? <StepImport selection={selection} onBack={back} /> : null}
    </div>
  );
}
