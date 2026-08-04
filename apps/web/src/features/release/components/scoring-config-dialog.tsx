'use client';

import { useEffect, useState } from 'react';
import type { DefectSeverityLevel, ReleaseScoringConfig } from '@sprintguard/shared';
import { DEFECT_SEVERITIES } from '@sprintguard/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateReleaseScoringConfig } from '@/features/release/api';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface ScoringConfigDialogProps {
  sprintId: string;
  config: ReleaseScoringConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormState = Omit<ReleaseScoringConfig, 'projectId' | 'isCustomized'>;

function toFormState(config: ReleaseScoringConfig): FormState {
  return {
    requirementCoverageWeight: config.requirementCoverageWeight,
    testCaseCoverageWeight: config.testCaseCoverageWeight,
    manualExecutionWeight: config.manualExecutionWeight,
    automationExecutionWeight: config.automationExecutionWeight,
    bugRiskWeight: config.bugRiskWeight,
    severityDeductions: { ...config.severityDeductions },
    manualPassRateBlockThreshold: config.manualPassRateBlockThreshold,
    automationCoverageWarnThreshold: config.automationCoverageWarnThreshold,
  };
}

const WEIGHT_FIELDS: { key: keyof Omit<FormState, 'severityDeductions'>; label: string }[] = [
  { key: 'requirementCoverageWeight', label: 'Requirement Coverage' },
  { key: 'testCaseCoverageWeight', label: 'Test Case Coverage' },
  { key: 'manualExecutionWeight', label: 'Manual Execution Pass Rate' },
  { key: 'automationExecutionWeight', label: 'Automation Execution Pass Rate' },
  { key: 'bugRiskWeight', label: 'Open Bug Risk' },
];

export function ScoringConfigDialog({ sprintId, config, open, onOpenChange }: ScoringConfigDialogProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(config));
  const update = useUpdateReleaseScoringConfig(sprintId);

  useEffect(() => {
    if (open) setForm(toFormState(config));
  }, [open, config]);

  const weightSum = WEIGHT_FIELDS.reduce((sum, field) => sum + (form[field.key] || 0), 0);
  const weightSumValid = Math.abs(weightSum - 100) <= 0.5;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!weightSumValid) return;
    update.mutate(form, {
      onSuccess: () => {
        toast({ title: 'Scoring configuration updated' });
        onOpenChange(false);
      },
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not update scoring configuration',
          description: error instanceof ApiError ? error.message : undefined,
        }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure release readiness scoring</DialogTitle>
          <DialogDescription>
            Weights apply to every sprint in this project. Weights must sum to 100.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <p className="text-sm font-medium">Category weights</p>
            <div className="grid grid-cols-2 gap-3">
              {WEIGHT_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={field.key} className="text-xs text-muted-foreground">
                    {field.label}
                  </Label>
                  <Input
                    id={field.key}
                    type="number"
                    min={0}
                    max={100}
                    value={form[field.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))}
                  />
                </div>
              ))}
            </div>
            <p className={cn('text-xs', weightSumValid ? 'text-muted-foreground' : 'text-destructive')}>
              Total: {weightSum} {weightSumValid ? '' : '— weights must sum to 100'}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Bug severity deductions (points per open bug)</p>
            <div className="grid grid-cols-4 gap-3">
              {DEFECT_SEVERITIES.map((severity: DefectSeverityLevel) => (
                <div key={severity} className="space-y-1">
                  <Label htmlFor={`severity-${severity}`} className="text-xs text-muted-foreground">
                    {severity}
                  </Label>
                  <Input
                    id={`severity-${severity}`}
                    type="number"
                    max={0}
                    value={form.severityDeductions[severity]}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        severityDeductions: { ...prev.severityDeductions, [severity]: Number(e.target.value) },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Mandatory rule thresholds</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="manualPassRateBlockThreshold" className="text-xs text-muted-foreground">
                  Manual pass rate block threshold (%)
                </Label>
                <Input
                  id="manualPassRateBlockThreshold"
                  type="number"
                  min={0}
                  max={100}
                  value={form.manualPassRateBlockThreshold}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, manualPassRateBlockThreshold: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="automationCoverageWarnThreshold" className="text-xs text-muted-foreground">
                  Automation coverage warning threshold (%)
                </Label>
                <Input
                  id="automationCoverageWarnThreshold"
                  type="number"
                  min={0}
                  max={100}
                  value={form.automationCoverageWarnThreshold}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, automationCoverageWarnThreshold: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!weightSumValid || update.isPending}>
              {update.isPending ? 'Saving…' : 'Save configuration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
