'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import type { PromptPlaygroundResult } from '@sprintguard/shared';
import { usePromptHistory, usePromptList, usePromptVariables, useRunPromptPlayground } from '@/features/prompts/api';

interface RunRecord extends PromptPlaygroundResult {
  id: string;
  capability: string;
  version: string;
  runAt: Date;
}

export function PromptPlayground() {
  const { data: library } = usePromptList({ pageSize: 100 });
  const [capability, setCapability] = useState<string | undefined>();
  const { data: versions } = usePromptHistory(capability);
  const [version, setVersion] = useState<string | undefined>();
  const { data: variableNames } = usePromptVariables(capability, version);
  const [values, setValues] = useState<Record<string, string>>({});
  const [provider, setProvider] = useState<string | undefined>();
  const runPlayground = useRunPromptPlayground();
  const [runs, setRuns] = useState<RunRecord[]>([]);

  const selectedPrompt = versions?.find((v) => v.version === version);

  const onRun = () => {
    if (!selectedPrompt) return;
    runPlayground.mutate(
      { promptId: selectedPrompt.id, variables: values, provider },
      {
        onSuccess: (result) => {
          setRuns((prev) => [
            { ...result, id: crypto.randomUUID(), capability: capability!, version: version!, runAt: new Date() },
            ...prev,
          ]);
        },
      },
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Run configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Prompt</Label>
            <Select value={capability} onValueChange={(v) => { setCapability(v); setVersion(undefined); setValues({}); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a prompt" />
              </SelectTrigger>
              <SelectContent>
                {(library?.rows ?? []).map((row) => (
                  <SelectItem key={row.capability} value={row.capability}>
                    {row.name ?? row.capability}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Version</Label>
            <Select value={version} onValueChange={setVersion} disabled={!capability}>
              <SelectTrigger>
                <SelectValue placeholder="Select a version" />
              </SelectTrigger>
              <SelectContent>
                {(versions ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.version}>
                    {v.version} · {v.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Provider override (optional)</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v === 'default' ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Use configured provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Use configured provider</SelectItem>
                <SelectItem value="groq">groq</SelectItem>
                <SelectItem value="openai">openai</SelectItem>
                <SelectItem value="anthropic">anthropic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {version && (variableNames ?? []).length > 0 ? (
            <div className="space-y-2 border-t pt-3">
              <Label>Sample input</Label>
              {(variableNames ?? []).map((name) => (
                <div key={name} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{`{{${name}}}`}</Label>
                  <Input
                    value={values[name] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <Button className="w-full" onClick={onRun} disabled={!selectedPrompt || runPlayground.isPending}>
            <Play className="mr-2 h-4 w-4" /> {runPlayground.isPending ? 'Running…' : 'Run'}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {runs.length === 0 ? (
          <EmptyState icon={Play} title="No runs yet" description="Configure a prompt and click Run to test it before activating." />
        ) : (
          runs.map((run) => (
            <Card key={run.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">
                  {run.capability} · {run.version}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={run.success ? 'success' : 'destructive'}>{run.success ? 'Success' : 'Failed'}</Badge>
                  {run.runAt.toLocaleTimeString()}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {run.success ? (
                  <>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="rounded-md border p-2">
                        <p className="text-muted-foreground">Latency</p>
                        <p className="font-medium">{run.latencyMs ?? '—'}ms</p>
                      </div>
                      <div className="rounded-md border p-2">
                        <p className="text-muted-foreground">Confidence</p>
                        <p className="font-medium">
                          {run.confidenceScore !== undefined ? `${Math.round(run.confidenceScore * 100)}%` : '—'}
                        </p>
                      </div>
                      <div className="rounded-md border p-2">
                        <p className="text-muted-foreground">Tokens</p>
                        <p className="font-medium">{run.tokensUsed ?? '—'}</p>
                      </div>
                      <div className="rounded-md border p-2">
                        <p className="text-muted-foreground">Cost</p>
                        <p className="font-medium">{run.costUsd ? `$${run.costUsd.toFixed(4)}` : '—'}</p>
                      </div>
                    </div>
                    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                      {JSON.stringify(run.parsedOutput, null, 2)}
                    </pre>
                  </>
                ) : (
                  <p className="text-xs text-destructive">{run.errorMessage}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
