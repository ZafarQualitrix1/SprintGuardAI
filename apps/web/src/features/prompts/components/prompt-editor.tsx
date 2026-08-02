'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Braces, Copy, Expand, Minimize2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  useActivatePrompt,
  useApprovePrompt,
  useArchivePrompt,
  useClonePrompt,
  useDeletePrompt,
  usePromptVariables,
  usePromptVersion,
  useRejectPrompt,
  useSubmitPromptForReview,
  useUpdatePromptDraft,
} from '@/features/prompts/api';

const CodeEditor = dynamic(() => import('@uiw/react-textarea-code-editor'), { ssr: false });

const AUTO_SAVE_DELAY_MS = 1200;

function statusColor(status: string): 'success' | 'warning' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'APPROVED') return 'secondary';
  if (status === 'IN_REVIEW') return 'warning';
  if (status === 'DEPRECATED') return 'destructive';
  return 'outline';
}

interface PromptEditorProps {
  capability: string;
  version: string;
  onVersionChange: (version: string) => void;
  onViewHistory: () => void;
}

export function PromptEditor({ capability, version, onVersionChange, onViewHistory }: PromptEditorProps) {
  const { data: prompt, isLoading } = usePromptVersion(capability, version);
  const { data: variables } = usePromptVariables(capability, version);
  const updateDraft = useUpdatePromptDraft(capability, version);
  const submitForReview = useSubmitPromptForReview(capability, version);
  const approve = useApprovePrompt(capability, version);
  const reject = useRejectPrompt(capability, version);
  const activate = useActivatePrompt(capability, version);
  const archive = useArchivePrompt(capability, version);
  const del = useDeletePrompt(capability, version);
  const clone = useClonePrompt(capability, version);

  const [template, setTemplate] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (prompt) {
      setTemplate(prompt.template);
      setName(prompt.name ?? '');
      setDescription(prompt.description ?? '');
      setCategory(prompt.category ?? '');
      setTagsInput(prompt.tags.join(', '));
      setSavedAt(null);
    }
  }, [prompt?.id]);

  const isDraft = prompt?.status === 'DRAFT';

  const scheduleAutoSave = (patch: Record<string, unknown>) => {
    if (!isDraft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateDraft.mutate(patch, { onSuccess: () => setSavedAt(new Date()) });
    }, AUTO_SAVE_DELAY_MS);
  };

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const detectedVariables = useMemo(() => variables ?? [], [variables]);

  if (isLoading || !prompt) {
    return <Skeleton className="h-96 w-full" />;
  }

  const insertVariable = (name: string) => {
    const token = `{{${name}}}`;
    setTemplate((prev) => `${prev}${token}`);
    scheduleAutoSave({ template: `${template}${token}` });
  };

  const handleClone = () =>
    clone.mutate(undefined, {
      onSuccess: (newPrompt) => {
        toast({ title: 'Cloned to new draft', description: `${newPrompt.capability} ${newPrompt.version}` });
        onVersionChange(newPrompt.version);
      },
      onError: (error) => toast({ variant: 'destructive', title: 'Clone failed', description: error instanceof ApiError ? error.message : undefined }),
    });

  return (
    <div className={cn('space-y-4', fullscreen && 'fixed inset-0 z-50 overflow-y-auto bg-background p-6')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">{prompt.name ?? prompt.capability}</h3>
          <Badge variant={statusColor(prompt.status)}>{prompt.status}</Badge>
          {prompt.isActive ? <Badge variant="success">Live</Badge> : null}
          <span className="text-xs text-muted-foreground">{prompt.version}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {updateDraft.isPending ? (
            <span className="text-xs text-muted-foreground">Saving…</span>
          ) : savedAt ? (
            <span className="text-xs text-muted-foreground">Saved {savedAt.toLocaleTimeString()}</span>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(prompt.template).then(() => toast({ title: 'Template copied' }))}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleClone} disabled={clone.isPending}>
            Clone
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          {!isDraft ? (
            <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
              This version is {prompt.status}. Editing is locked — clone it to create a new DRAFT you can edit.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                disabled={!isDraft}
                onChange={(e) => {
                  setName(e.target.value);
                  scheduleAutoSave({ name: e.target.value });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={category}
                disabled={!isDraft}
                onChange={(e) => {
                  setCategory(e.target.value);
                  scheduleAutoSave({ category: e.target.value });
                }}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Input
                value={description}
                disabled={!isDraft}
                onChange={(e) => {
                  setDescription(e.target.value);
                  scheduleAutoSave({ description: e.target.value });
                }}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={tagsInput}
                disabled={!isDraft}
                onChange={(e) => {
                  setTagsInput(e.target.value);
                  scheduleAutoSave({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) });
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Prompt Template</Label>
              <span className="text-xs text-muted-foreground">{template.split('\n').length} lines</span>
            </div>
            {showPreview ? (
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">
                {template.split(/(\{\{\w+\}\})/g).map((part, i) =>
                  /^\{\{\w+\}\}$/.test(part) ? (
                    <span key={i} className="rounded bg-primary/20 px-1 text-primary">
                      {part}
                    </span>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              </pre>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <CodeEditor
                  value={template}
                  language="markdown"
                  placeholder="Write the prompt template. Use {{variableName}} for substitution."
                  disabled={!isDraft}
                  onChange={(e) => {
                    setTemplate(e.target.value);
                    scheduleAutoSave({ template: e.target.value });
                  }}
                  padding={12}
                  minHeight={fullscreen ? 400 : 260}
                  style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
                  data-color-mode="dark"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium">
              <Braces className="h-3.5 w-3.5" /> Variables
            </p>
            {detectedVariables.length === 0 ? (
              <p className="text-xs text-muted-foreground">No {'{{variables}}'} detected yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {detectedVariables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={!isDraft}
                    onClick={() => insertVariable(v)}
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-medium">Lifecycle</p>
            {prompt.status === 'DRAFT' ? (
              <Button size="sm" className="w-full" onClick={() => submitForReview.mutate()} disabled={submitForReview.isPending}>
                Submit for Review
              </Button>
            ) : null}
            {prompt.status === 'IN_REVIEW' ? (
              <>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => approve.mutate(undefined)}
                  disabled={approve.isPending}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const rationale = window.prompt('Reason for rejection:');
                    if (rationale) reject.mutate(rationale);
                  }}
                  disabled={reject.isPending}
                >
                  Reject
                </Button>
              </>
            ) : null}
            {prompt.status === 'APPROVED' ? (
              <Button size="sm" className="w-full" onClick={() => activate.mutate()} disabled={activate.isPending}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Activate
              </Button>
            ) : null}
            {(prompt.status === 'APPROVED' || prompt.status === 'ACTIVE') && !prompt.isActive ? (
              <Button size="sm" variant="outline" className="w-full" onClick={() => archive.mutate()} disabled={archive.isPending}>
                Archive
              </Button>
            ) : null}
            {prompt.status === 'DRAFT' ? (
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-destructive"
                onClick={() => {
                  if (window.confirm('Delete this draft? This cannot be undone.')) {
                    del.mutate(undefined, { onSuccess: onViewHistory });
                  }
                }}
                disabled={del.isPending}
              >
                Delete draft
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" className="w-full" onClick={onViewHistory}>
              View full history
            </Button>
          </div>

          {prompt.approvals.length > 0 ? (
            <div className="space-y-1.5 rounded-md border p-3">
              <p className="text-xs font-medium">Approval history</p>
              {prompt.approvals.map((approval) => (
                <div key={approval.id} className="text-xs text-muted-foreground">
                  <Badge variant={approval.decision === 'APPROVED' ? 'success' : 'destructive'} className="mr-1.5">
                    {approval.decision}
                  </Badge>
                  {approval.reviewerName} · {new Date(approval.createdAt).toLocaleDateString()}
                  {approval.rationale ? <p className="mt-0.5 italic">&ldquo;{approval.rationale}&rdquo;</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
